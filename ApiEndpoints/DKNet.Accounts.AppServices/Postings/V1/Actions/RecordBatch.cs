using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.AppServices.Postings.V1.Specs;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Domains.Share;
// The enclosing namespace declares its own PostingCategory/PostingDirection (this file's own Category/
// Direction properties, below) — these aliases reach the Domain entity's enums of the same simple names
// unambiguously.
using DomainPostingCategory = DKNet.Accounts.Domains.Features.Postings.Entities.PostingCategory;
using DomainPostingDirection = DKNet.Accounts.Domains.Features.Postings.Entities.PostingDirection;

namespace DKNet.Accounts.AppServices.Postings.V1.Actions;

/// <summary>
/// One movement inside a <see cref="RecordPostingBatchRequest"/> — several movements recorded as one
/// all-or-nothing batch.
/// </summary>
public sealed record PostingBatchMovement
{
    public Guid AccountId { get; set; }

    public PostingDirection Direction { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = null!;

    public DateOnly? EffectiveDate { get; set; }

    public PostingCategory Category { get; set; }

    public string? Description { get; set; }

    public Guid? CounterpartyAccountId { get; set; }

    public string? CounterpartyReference { get; set; }

    public string? ExternalReference { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }
}

public sealed record RecordPostingBatchRequest : Fluents.Requests.IWitResponse<IReadOnlyCollection<PostingDto>>
{
    public IReadOnlyCollection<PostingBatchMovement> Movements { get; set; } = [];

    /// <summary>
    /// Ties the legs of this batch together. When unset, a new one is generated so every movement in the
    /// batch still shares one transaction group identifier.
    /// </summary>
    public Guid? TransactionGroupId { get; set; }

    public string? RecordedBy { get; set; }

    public string? IdempotencyKey { get; set; }
}

internal sealed class RecordPostingBatchCommandValidator : AbstractValidator<RecordPostingBatchRequest>
{
    public RecordPostingBatchCommandValidator()
    {
        RuleFor(r => r.Movements).NotEmpty();
        RuleForEach(r => r.Movements).ChildRules(movement =>
        {
            movement.RuleFor(m => m.AccountId).NotEmpty();
            movement.RuleFor(m => m.Direction).IsInEnum();
            movement.RuleFor(m => m.Currency).NotEmpty().Length(3);
            movement.RuleFor(m => m.Category).IsInEnum();
        });
    }
}

/// <summary>
/// Records several movements as one all-or-nothing batch under a single shared transaction group id. Every
/// distinct account touched is locked, in ascending id order (deterministic — avoids two concurrent batches
/// that share accounts deadlocking each other), before any of them is read or mutated. Movements are applied
/// in submission order — a repeated account's floor is evaluated against its running in-batch balance — and
/// nothing is persisted (no <see cref="IRepositorySpec.SaveChangesAsync"/> call, so the auto-save
/// interceptor never fires either) unless every movement succeeds.
/// </summary>
internal sealed class RecordPostingBatchCommandHandler(
    IRepositorySpec repository,
    IMapper mapper,
    IPostingNumberGenerator postingNumbers,
    IAccountLockProvider locks,
    ICallingSystemAccessor callingSystem,
    TimeProvider clock)
    : Fluents.Requests.IHandler<RecordPostingBatchRequest, IReadOnlyCollection<PostingDto>>
{
    public async Task<IResult<IReadOnlyCollection<PostingDto>>> OnHandle(
        RecordPostingBatchRequest request,
        CancellationToken cancellationToken)
    {
        var byUser = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(byUser))
        {
            return Result.Fail<IReadOnlyCollection<PostingDto>>("The caller is not authenticated.");
        }

        var recordedAt = clock.GetUtcNow();
        var recordingDate = DateOnly.FromDateTime(recordedAt.UtcDateTime);
        var transactionGroupId = request.TransactionGroupId ?? Guid.NewGuid();

        var signature = ComputeBatchSignature(request.Movements, recordingDate);
        if (!string.IsNullOrEmpty(request.IdempotencyKey))
        {
            var existing = await repository.FirstOrDefaultAsync(
                new SpecGetPosting(byCallingSystem: byUser, byIdempotencyKey: request.IdempotencyKey),
                cancellationToken);
            if (existing is not null)
            {
                if (existing.IdempotencySignature != signature)
                {
                    return Result.Fail<IReadOnlyCollection<PostingDto>>(LedgerErrors.Error(
                        LedgerErrors.IdempotencyKeyConflict,
                        "This idempotency key was already used for a different request."));
                }

                // Rework finding 5: `existing` is matched on (CallingSystem, IdempotencyKey) alone, so it can
                // be a posting written by the single-posting endpoint, where TransactionGroupId is optional
                // (Record.cs) — unlike a batch leg, which always carries one. A one-movement batch replaying
                // that key computes the same signature as the original single posting, so it must replay that
                // single posting directly rather than querying a "group" that was never created.
                var priorLegs = existing.TransactionGroupId is { } groupId
                    ? await repository.ToListAsync(new SpecListPostingsByTransactionGroup(groupId), cancellationToken)
                    : [existing];
                return LedgerErrors.Replayed<IReadOnlyCollection<PostingDto>>(
                    priorLegs.Select(p => mapper.Map<PostingDto>(p)).ToList());
            }
        }

        var accountIds = request.Movements.Select(m => m.AccountId).Distinct().OrderBy(id => id).ToList();
        var acquired = new List<IDisposable>();
        try
        {
            foreach (var accountId in accountIds)
            {
                acquired.Add(await locks.AcquireAsync(accountId, PostingLocking.LockTimeout, cancellationToken));
            }
        }
        catch (TimeoutException)
        {
            foreach (var handle in acquired)
            {
                handle.Dispose();
            }

            return Result.Fail<IReadOnlyCollection<PostingDto>>(LedgerErrors.Error(
                LedgerErrors.LockTimeout, "Timed out waiting to record against one of this batch's accounts."));
        }

        try
        {
            var accounts = new Dictionary<Guid, Account>();
            foreach (var accountId in accountIds)
            {
                var account = await repository.FirstOrDefaultAsync(new SpecGetAccount(accountId), cancellationToken);
                if (account is null)
                {
                    return Result.Fail<IReadOnlyCollection<PostingDto>>(
                        new NotFoundError($"The account {accountId} was not found."));
                }

                accounts[accountId] = account;
            }

            var postings = new List<Posting>(request.Movements.Count);
            foreach (var movement in request.Movements)
            {
                var currency = Currency.All.FirstOrDefault(c => c.Code == movement.Currency);
                if (currency is null)
                {
                    return Result.Fail<IReadOnlyCollection<PostingDto>>(LedgerErrors.Error(
                        LedgerErrors.UnsupportedCurrency, $"'{movement.Currency}' is not a supported currency."));
                }

                if (PostingAmount.Validate(movement.Amount, currency) != PostingAmountValidation.Valid)
                {
                    return Result.Fail<IReadOnlyCollection<PostingDto>>(LedgerErrors.Error(
                        LedgerErrors.InvalidPostingAmount,
                        "The amount must be positive and match the currency's precision."));
                }

                var effectiveDate = movement.EffectiveDate ?? recordingDate;
                if (effectiveDate > recordingDate)
                {
                    return Result.Fail<IReadOnlyCollection<PostingDto>>(LedgerErrors.Error(
                        LedgerErrors.EffectiveDateInFuture,
                        "The effective date cannot be later than the recording date."));
                }

                var account = accounts[movement.AccountId];
                if (account.CurrencyCode != currency.Code)
                {
                    return Result.Fail<IReadOnlyCollection<PostingDto>>(LedgerErrors.Error(
                        LedgerErrors.CurrencyMismatch, "The posting's currency does not match the account's."));
                }

                var isDebit = movement.Direction == PostingDirection.Debit;
                var application = account.TryApplyPosting(isDebit, movement.Amount, recordedAt);
                if (!application.Success)
                {
                    return Result.Fail<IReadOnlyCollection<PostingDto>>(application.Refusal.ToError());
                }

                var postingNumber = await postingNumbers.NextValueAsync();
                postings.Add(new Posting(
                    account.Id,
                    postingNumber,
                    application.Position,
                    (DomainPostingDirection)movement.Direction,
                    movement.Amount,
                    currency.Code,
                    application.SignedValue,
                    application.BalanceAfter,
                    effectiveDate,
                    recordedAt,
                    (DomainPostingCategory)movement.Category,
                    transactionGroupId,
                    movement.CounterpartyAccountId,
                    movement.CounterpartyReference,
                    byUser,
                    null,
                    null,
                    movement.ExternalReference,
                    movement.Description,
                    movement.Metadata,
                    byUser));
            }

            // The batch's idempotency key/signature live on its first leg only — a DB unique index on
            // (CallingSystem, IdempotencyKey) allows one row per key, so the key can't be duplicated across
            // every leg without violating it.
            if (!string.IsNullOrEmpty(request.IdempotencyKey) && postings.Count > 0)
            {
                postings[0].StampIdempotency(request.IdempotencyKey, signature);
            }

            await repository.AddRangeAsync(postings, cancellationToken);
            await repository.SaveChangesAsync(cancellationToken);

            return Result.Ok<IReadOnlyCollection<PostingDto>>(postings.Select(p => mapper.Map<PostingDto>(p)).ToList());
        }
        finally
        {
            foreach (var handle in acquired)
            {
                handle.Dispose();
            }
        }
    }

    private static string ComputeBatchSignature(IReadOnlyCollection<PostingBatchMovement> movements, DateOnly recordingDate) =>
        string.Join('|', movements.Select(m => PostingSignature.Compute(
            m.AccountId, m.Direction, m.Amount, m.Currency, m.Category, m.EffectiveDate ?? recordingDate,
            m.Description, m.CounterpartyAccountId, m.CounterpartyReference, m.ExternalReference, m.Metadata)));
}

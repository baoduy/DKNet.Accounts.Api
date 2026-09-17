using DKNet.AspCore.Extensions.ModelBinding;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.AppServices.Postings.V1.Specs;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Domains.Share;

namespace DKNet.Accounts.AppServices.Postings.V1.Actions;

/// <summary>
/// Records a single credit or debit. <see cref="IdempotencyKey"/> is populated from the <c>Idempotency-Key</c>
/// request header via <see cref="FromRequestHeaderAttribute"/> — before validation and before the handler runs
/// — scoped to the calling system. A caller-supplied value for this property is always overwritten, so it can
/// never be forged through the request body (R3). <see cref="RecordedBy"/> mirrors the contract's
/// <c>recordedBy</c> body field — model-bound but never read: the calling system is always taken from the
/// credential's <c>client_id</c> claim (§5), never from the request body.
/// </summary>
public sealed record RecordPostingRequest : Fluents.Requests.IWitResponse<PostingDto>
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

    public Guid? TransactionGroupId { get; set; }

    public string? ExternalReference { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }

    public string? RecordedBy { get; set; }

    [FromRequestHeader("Idempotency-Key")]
    public string? IdempotencyKey { get; set; }
}

internal sealed class RecordPostingCommandValidator : AbstractValidator<RecordPostingRequest>
{
    public RecordPostingCommandValidator()
    {
        RuleFor(r => r.AccountId).NotEmpty();
        RuleFor(r => r.Direction).IsInEnum();
        RuleFor(r => r.Currency).NotEmpty().Length(3);
        RuleFor(r => r.Category).IsInEnum();
    }
}

internal sealed class RecordPostingCommandHandler(
    IRepositorySpec repository,
    IMapper mapper,
    IPostingNumberGenerator postingNumbers,
    IAccountLockProvider locks,
    ICallingSystemAccessor callingSystem,
    TimeProvider clock)
    : Fluents.Requests.IHandler<RecordPostingRequest, PostingDto>
{
    public async Task<IResult<PostingDto>> OnHandle(RecordPostingRequest request, CancellationToken cancellationToken)
    {
        var callingSystemId = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(callingSystemId))
        {
            return Result.Fail<PostingDto>("The caller is not authenticated.");
        }

        var currency = Currency.All.FirstOrDefault(c => c.Code == request.Currency);
        if (currency is null)
        {
            return Result.Fail<PostingDto>(LedgerErrors.Error(
                LedgerErrors.UnsupportedCurrency, $"'{request.Currency}' is not a supported currency."));
        }

        if (PostingAmount.Validate(request.Amount, currency) != PostingAmountValidation.Valid)
        {
            return Result.Fail<PostingDto>(LedgerErrors.Error(
                LedgerErrors.InvalidPostingAmount, "The amount must be positive and match the currency's precision."));
        }

        var recordedAt = clock.GetUtcNow();
        var recordingDate = DateOnly.FromDateTime(recordedAt.UtcDateTime);
        var effectiveDate = request.EffectiveDate ?? recordingDate;
        if (effectiveDate > recordingDate)
        {
            return Result.Fail<PostingDto>(LedgerErrors.Error(
                LedgerErrors.EffectiveDateInFuture, "The effective date cannot be later than the recording date."));
        }

        var signature = PostingSignature.Compute(
            request.AccountId, request.Direction, request.Amount, currency.Code, request.Category, effectiveDate,
            request.Description, request.CounterpartyAccountId, request.CounterpartyReference,
            request.ExternalReference, request.Metadata);

        // ponytail: this read happens before the account lock below is acquired, so two simultaneous
        // first-uses of the same key can both miss here and both proceed — the second is refused 409 by the
        // DB's unique (CallingSystem, IdempotencyKey) index instead of getting the documented replay. Accepted:
        // the race is rare and fails safe (a clear conflict, not silent double-posting or data loss), not
        // worth moving the read inside the lock without a redesign (the lock keys on account id, not on the
        // idempotency key/calling-system pair this check reads).
        if (!string.IsNullOrEmpty(request.IdempotencyKey))
        {
            var existing = await repository.FirstOrDefaultAsync(
                new SpecGetPosting(byCallingSystem: callingSystemId, byIdempotencyKey: request.IdempotencyKey),
                cancellationToken);
            if (existing is not null)
            {
                return existing.IdempotencySignature == signature
                    ? LedgerErrors.Replayed(mapper.Map<PostingDto>(existing))
                    : Result.Fail<PostingDto>(LedgerErrors.Error(
                        LedgerErrors.IdempotencyKeyConflict,
                        "This idempotency key was already used for a different request."));
            }
        }

        IDisposable accountLock;
        try
        {
            accountLock = await locks.AcquireAsync(request.AccountId, PostingLocking.LockTimeout, cancellationToken);
        }
        catch (TimeoutException)
        {
            return Result.Fail<PostingDto>(LedgerErrors.Error(
                LedgerErrors.LockTimeout, "Timed out waiting to record against this account."));
        }

        using (accountLock)
        {
            var account = await repository.FirstOrDefaultAsync(new SpecGetAccount(request.AccountId), cancellationToken);
            if (account is null)
            {
                return Result.Fail<PostingDto>(new NotFoundError($"The account {request.AccountId} was not found."));
            }

            if (account.CurrencyCode != currency.Code)
            {
                return Result.Fail<PostingDto>(LedgerErrors.Error(
                    LedgerErrors.CurrencyMismatch, "The posting's currency does not match the account's."));
            }

            var isDebit = request.Direction == PostingDirection.Debit;
            var application = account.TryApplyPosting(isDebit, request.Amount, recordedAt);
            if (!application.Success)
            {
                return Result.Fail<PostingDto>(application.Refusal.ToError());
            }

            var postingNumber = await postingNumbers.NextValueAsync();
            var posting = new Posting(
                account.Id,
                postingNumber,
                application.Position,
                request.Direction,
                request.Amount,
                currency.Code,
                application.SignedValue,
                application.BalanceAfter,
                effectiveDate,
                recordedAt,
                request.Category,
                request.TransactionGroupId,
                request.CounterpartyAccountId,
                request.CounterpartyReference,
                callingSystemId,
                request.IdempotencyKey,
                string.IsNullOrEmpty(request.IdempotencyKey) ? null : signature,
                request.ExternalReference,
                request.Description,
                request.Metadata);

            await repository.AddAsync(posting, cancellationToken);
            await repository.SaveChangesAsync(cancellationToken);

            return Result.Ok(mapper.Map<PostingDto>(posting));
        }
    }
}

using Microsoft.EntityFrameworkCore;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.AppServices.Postings.V1.Specs;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.AppServices.Postings.V1.Actions;

/// <summary>
/// Reverses a posting. Exempt from the account's floor but not from its status (§ invariants) — a
/// posting can be reversed at most once. Both <see cref="Reason"/> and <see cref="IdempotencyKey"/> are
/// required: the reason is the audit record of WHY the correction was made (there is no other place to put
/// it — a posting is never edited), and the key makes a retried reversal replay its first outcome instead of
/// being refused POSTING_ALREADY_REVERSED. <see cref="IdempotencyKey"/> is populated from the
/// <c>Idempotency-Key</c> request header via <see cref="FromRequestHeaderAttribute"/> — before validation and
/// before the handler runs — so a caller-supplied body field of the same name can never forge it (R3).
/// </summary>
public sealed record ReversePostingRequest
    : Fluents.Requests.IWitResponse<PostingDto>, Fluents.Requests.IWithKey<Guid>
{
    public Guid Id { get; set; }

    /// <summary>Why this posting is being reversed. Recorded as the reversal posting's
    /// <see cref="Domains.Features.Postings.Entities.Posting.Description"/>, whose column is varchar(500).</summary>
    public string Reason { get; set; } = null!;

    [FromRequestHeader("Idempotency-Key")]
    public string? IdempotencyKey { get; set; }
}

internal sealed class ReversePostingCommandValidator : AbstractValidator<ReversePostingRequest>
{
    public ReversePostingCommandValidator()
    {
        RuleFor(r => r.Reason).NotEmpty().MaximumLength(500);
        RuleFor(r => r.IdempotencyKey).NotEmpty();
    }
}

/// <summary>
/// Writes an opposing posting (same amount, opposite direction, category Reversal, effective-dated the day
/// it is written, carrying the caller's reason as its description) and marks the original reversed with a
/// back-link — one-way, applied at most once. The request's idempotency key is checked before anything else
/// is read, so a retried reversal replays the reversal it already wrote rather than hitting the
/// already-reversed refusal; a genuinely new request (its own key) against an already-reversed posting is
/// still refused POSTING_ALREADY_REVERSED. Exempt
/// from the account's floor only; never from its status gate (frozen/closed refuse either direction; a
/// dormant account refuses only a reversal that would debit it). Concurrency-safe: two concurrent reversal
/// requests for the same posting share that posting's account lock, so the second one always re-reads the
/// posting's (by-then persisted) <see cref="Domains.Features.Postings.Entities.PostingStatus.Reversed"/>
/// status and is refused POSTING_ALREADY_REVERSED.
/// </summary>
internal sealed class ReversePostingCommandHandler(
    IRepositorySpec repository,
    IMapper mapper,
    IPostingNumberGenerator postingNumbers,
    IAccountLockProvider locks,
    ICallingSystemAccessor callingSystem,
    TimeProvider clock)
    : Fluents.Requests.IHandler<ReversePostingRequest, PostingDto>
{
    public async Task<IResult<PostingDto>> OnHandle(ReversePostingRequest request, CancellationToken cancellationToken)
    {
        var callingSystemId = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(callingSystemId))
        {
            return Result.Fail<PostingDto>("The caller is not authenticated.");
        }

        // Fails closed rather than trusting ReversePostingCommandValidator to have run: SpecGetPosting SKIPS
        // its (CallingSystem, IdempotencyKey) clause when the key is null, so the replay lookup below would
        // match an arbitrary posting and answer a false replay — the one outcome worse than refusing.
        if (string.IsNullOrEmpty(request.IdempotencyKey))
        {
            return Result.Fail<PostingDto>("An Idempotency-Key header is required to reverse a posting.");
        }

        // Reverse's request is not posting-shaped, so it folds its own meaningful content (which posting, and
        // why) through the same hash PostingSignature uses for a batch — one varchar(64) either way.
        var signature = PostingSignature.Hash($"reverse|{request.Id}|{request.Reason}");

        // Pre-lock, exactly as RecordPostingCommandHandler does it — including the accepted race documented
        // in that handler's ponytail note (two simultaneous first-uses of one key both miss here and the
        // second is refused 409 by the DB's unique index instead of replaying).
        var replayed = await repository.FirstOrDefaultAsync(
            new SpecGetPosting(byCallingSystem: callingSystemId, byIdempotencyKey: request.IdempotencyKey),
            cancellationToken);
        if (replayed is not null)
        {
            return replayed.IdempotencySignature == signature
                ? LedgerErrors.Replayed(mapper.Map<PostingDto>(replayed))
                : Result.Fail<PostingDto>(LedgerErrors.Error(
                    LedgerErrors.IdempotencyKeyConflict,
                    "This idempotency key was already used for a different request."));
        }

        // A no-tracking projection, deliberately: only to learn which account to lock before the real,
        // tracked read. A second FirstOrDefaultAsync for the same id in this same DbContext would be answered
        // from the change tracker's identity map — the cached, pre-lock instance — never re-hitting the
        // database, which would defeat the whole point of reading again once the lock is held.
        var accountId = await repository.Query(new SpecGetPosting(request.Id))
            .Select(p => (Guid?)p.AccountId)
            .FirstOrDefaultAsync(cancellationToken);
        if (accountId is null)
        {
            return Result.Fail<PostingDto>(new NotFoundError($"The posting {request.Id} was not found."));
        }

        IDisposable accountLock;
        try
        {
            accountLock = await locks.AcquireAsync(accountId.Value, PostingLocking.LockTimeout, cancellationToken);
        }
        catch (TimeoutException)
        {
            return Result.Fail<PostingDto>(LedgerErrors.Error(
                LedgerErrors.LockTimeout, "Timed out waiting to reverse against this account."));
        }

        using (accountLock)
        {
            // The first (and only) tracked read of this posting in this request — guaranteed fresh, so a
            // reversal that committed and released the lock just before this one acquired it is always seen.
            var original = await repository.FirstOrDefaultAsync(new SpecGetPosting(request.Id), cancellationToken);
            if (original is null)
            {
                return Result.Fail<PostingDto>(new NotFoundError($"The posting {request.Id} was not found."));
            }

            if (original.Status == PostingStatus.Reversed)
            {
                return Result.Fail<PostingDto>(LedgerErrors.Error(
                    LedgerErrors.PostingAlreadyReversed, "This posting has already been reversed."));
            }

            var account = await repository.FirstOrDefaultAsync(new SpecGetAccount(original.AccountId), cancellationToken);
            if (account is null)
            {
                return Result.Fail<PostingDto>(new NotFoundError($"The account {original.AccountId} was not found."));
            }

            var recordedAt = clock.GetUtcNow();
            var reversalIsDebit = original.Direction == PostingDirection.Credit;
            var application = account.TryApplyPosting(reversalIsDebit, original.Amount, recordedAt, isReversal: true);
            if (!application.Success)
            {
                return Result.Fail<PostingDto>(application.Refusal.ToError());
            }

            var postingNumber = await postingNumbers.NextValueAsync();
            var reversal = new Posting(
                account.Id,
                postingNumber,
                application.Position,
                reversalIsDebit ? PostingDirection.Debit : PostingDirection.Credit,
                original.Amount,
                original.Currency,
                application.SignedValue,
                application.BalanceAfter,
                DateOnly.FromDateTime(recordedAt.UtcDateTime),
                recordedAt,
                PostingCategory.Reversal,
                original.TransactionGroupId,
                original.CounterpartyAccountId,
                original.CounterpartyReference,
                callingSystemId,
                request.IdempotencyKey,
                signature,
                original.ExternalReference,
                request.Reason,
                original.Metadata);
            reversal.LinkAsReversalOf(original.Id);

            original.MarkReversedBy(reversal.Id);

            await repository.AddAsync(reversal, cancellationToken);
            await repository.SaveChangesAsync(cancellationToken);

            return Result.Ok(mapper.Map<PostingDto>(reversal));
        }
    }
}

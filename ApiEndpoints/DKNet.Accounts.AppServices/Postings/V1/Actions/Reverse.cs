using Microsoft.EntityFrameworkCore;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.AppServices.Crud;
using DKNet.Accounts.AppServices.Postings.V1.Specs;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.AppServices.Postings.V1.Actions;

// ReversePostingRequest ({Id} only) is generated from Posting's [CrudAction("reverse")] marker (DRK-1277 §3
// row 16). Reverses a posting. Exempt from the account's floor but not from its status (§ invariants) — a
// posting can be reversed at most once.

/// <summary>
/// Writes an opposing posting (same amount, opposite direction, category Reversal, effective-dated the day
/// it is written) and marks the original reversed with a back-link — one-way, applied at most once. Exempt
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
        var byUser = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(byUser))
        {
            return Result.Fail<PostingDto>("The caller is not authenticated.");
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
                byUser,
                null,
                null,
                original.ExternalReference,
                $"Reversal of {original.PostingNumber}",
                original.Metadata,
                byUser);
            reversal.LinkAsReversalOf(original.Id);

            original.MarkReversedBy(reversal.Id, byUser);

            await repository.AddAsync(reversal, cancellationToken);
            await repository.SaveChangesAsync(cancellationToken);

            return Result.Ok(mapper.Map<PostingDto>(reversal));
        }
    }
}

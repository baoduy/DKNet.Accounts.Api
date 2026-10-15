using DKNet.EfCore.Specifications.Definitions;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Domains.Features.Transfers.Entities;

namespace DKNet.Accounts.AppServices.Transfers.V1.Specs;

/// <summary>One transfer, by id or by the (calling system, idempotency key) it was recorded under. The key is
/// stored lowercased and the request lowercases its own, so a plain comparison is enough.</summary>
internal sealed class SpecGetTransfer : Specification<Transfer>
{
    public SpecGetTransfer(Guid id) => WithFilter(t => t.Id == id);

    public SpecGetTransfer(string callingSystem, string idempotencyKey) =>
        WithFilter(t => t.CallingSystem == callingSystem && t.IdempotencyKey == idempotencyKey);
}

/// <summary>The postings a transfer recorded (DRK-2276 R8): its transaction group without any later reversal,
/// in posting-number order.</summary>
internal sealed class SpecListTransferPostings : Specification<Posting>
{
    public SpecListTransferPostings(Guid transferId)
    {
        WithFilter(p => p.TransactionGroupId == transferId && p.ReversesPostingId == null);
        AddOrderBy(p => p.PostingNumber);
    }
}

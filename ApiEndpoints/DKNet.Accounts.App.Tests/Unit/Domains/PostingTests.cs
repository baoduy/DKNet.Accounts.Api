using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.App.Tests.Unit.Domains;

public class PostingTests
{
    private static Posting NewPosting() => new(
        accountId: Guid.NewGuid(),
        postingNumber: "PST0000000001",
        streamPosition: 1,
        direction: PostingDirection.Credit,
        amount: 100m,
        currency: "SGD",
        signedValue: 100m,
        balanceAfter: 100m,
        effectiveDate: DateOnly.FromDateTime(DateTime.UtcNow),
        recordedAt: DateTimeOffset.UtcNow,
        category: PostingCategory.Transfer,
        transactionGroupId: null,
        counterpartyAccountId: null,
        counterpartyReference: null,
        callingSystem: "PayHub",
        idempotencyKey: null,
        idempotencySignature: null,
        externalReference: null,
        description: null,
        metadata: null);

    [Fact]
    public void NewPosting_IsPostedAndUnlinked()
    {
        var posting = NewPosting();

        posting.Status.ShouldBe(PostingStatus.Posted);
        posting.ReversedByPostingId.ShouldBeNull();
        posting.ReversesPostingId.ShouldBeNull();
    }

    [Fact]
    public void NewPosting_LeavesCreatedByUnset_ForDataOwnerHookToStampOnSave()
    {
        // DRK-1372 §5/R1: the constructor takes no acting-user parameter any more. CreatedBy is left unset
        // here and stamped on save by DataOwnerHook/PrincipalProvider instead — never assigned in-process.
        var posting = NewPosting();

        posting.CreatedBy.ShouldBeNullOrEmpty();
    }

    [Fact]
    public void MarkReversedBy_TransitionsToReversedAndLinksTheReversal()
    {
        var posting = NewPosting();
        var reversalId = Guid.NewGuid();

        posting.MarkReversedBy(reversalId);

        posting.Status.ShouldBe(PostingStatus.Reversed);
        posting.ReversedByPostingId.ShouldBe(reversalId);
    }

    [Fact]
    public void MarkReversedBy_LeavesUpdatedByUnset_ForDataOwnerHookToStampOnSave()
    {
        var posting = NewPosting();

        posting.MarkReversedBy(Guid.NewGuid());

        posting.UpdatedBy.ShouldBeNullOrEmpty();
    }

    [Fact]
    public void MarkReversedBy_CalledTwice_ThrowsRatherThanApplyingTwice()
    {
        // Last line of defence: the handler checks Status itself (under the account's lock) so a genuine
        // repeat surfaces as a business refusal, not this exception — this proves the one-way transition can
        // never silently apply twice even if that check were ever bypassed.
        var posting = NewPosting();
        posting.MarkReversedBy(Guid.NewGuid());

        Should.Throw<InvalidOperationException>(() => posting.MarkReversedBy(Guid.NewGuid()));
    }

    [Fact]
    public void LinkAsReversalOf_SetsTheBackLink()
    {
        var posting = NewPosting();
        var originalId = Guid.NewGuid();

        posting.LinkAsReversalOf(originalId);

        posting.ReversesPostingId.ShouldBe(originalId);
    }

    [Fact]
    public void StampIdempotency_SetsKeyAndSignature()
    {
        var posting = NewPosting();

        posting.StampIdempotency("key-1", "signature-1");

        posting.IdempotencyKey.ShouldBe("key-1");
        posting.IdempotencySignature.ShouldBe("signature-1");
    }
}

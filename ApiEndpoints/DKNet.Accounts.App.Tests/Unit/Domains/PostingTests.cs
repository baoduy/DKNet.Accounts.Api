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
        metadata: null,
        byUser: "PayHub");

    [Fact]
    public void NewPosting_IsPostedAndUnlinked()
    {
        var posting = NewPosting();

        posting.Status.ShouldBe(PostingStatus.Posted);
        posting.ReversedByPostingId.ShouldBeNull();
        posting.ReversesPostingId.ShouldBeNull();
    }

    [Fact]
    public void MarkReversedBy_TransitionsToReversedAndLinksTheReversal()
    {
        var posting = NewPosting();
        var reversalId = Guid.NewGuid();

        posting.MarkReversedBy(reversalId, "PayHub");

        posting.Status.ShouldBe(PostingStatus.Reversed);
        posting.ReversedByPostingId.ShouldBe(reversalId);
    }

    [Fact]
    public void MarkReversedBy_CalledTwice_ThrowsRatherThanApplyingTwice()
    {
        // Last line of defence: the handler checks Status itself (under the account's lock) so a genuine
        // repeat surfaces as a business refusal, not this exception — this proves the one-way transition can
        // never silently apply twice even if that check were ever bypassed.
        var posting = NewPosting();
        posting.MarkReversedBy(Guid.NewGuid(), "PayHub");

        Should.Throw<InvalidOperationException>(() => posting.MarkReversedBy(Guid.NewGuid(), "PayHub"));
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

    [Fact]
    public void Reverse_IsAMarkerOnly_AndIsNeverActuallyInvoked()
    {
        // DRK-1277 §3 row 16: [CrudAction("reverse")] shapes the generated route/request only —
        // ReversePostingCommandHandler is the request's registered hand-written handler, so this method must
        // never run in the real reversal flow. Proves the marker's own guard, not that it is unreachable.
        var posting = NewPosting();

        Should.Throw<NotSupportedException>(() => posting.Reverse());
    }
}

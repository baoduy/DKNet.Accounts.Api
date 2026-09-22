using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.App.Tests.Unit.Domains;

public class AccountTests
{
    private static Account NewAccount(
        bool permittedToGoNegative = false,
        decimal? overdraftLimit = null,
        decimal? minimumBalance = null) => new(
        groupId: Guid.NewGuid(),
        accountNumber: "ACC-0000000001",
        name: "Operating",
        currencyCode: "SGD",
        classification: AccountClassification.Liability,
        permittedToGoNegative: permittedToGoNegative,
        overdraftLimit: overdraftLimit,
        minimumBalance: minimumBalance,
        externalReference: "ext-1",
        metadata: new Dictionary<string, string> { ["k"] = "v" });

    [Fact]
    public void NewAccount_IsActiveWithAZeroBalance()
    {
        var account = NewAccount();

        account.Status.ShouldBe(AccountStatus.Active);
        account.Balance.ShouldBe(0m);
        account.HeldAmount.ShouldBe(0m);
        account.AvailableBalance.ShouldBe(0m);
        account.StreamPosition.ShouldBe(0);
        account.ClosedOn.ShouldBeNull();
        account.OpenedOn.ShouldBe(account.CreatedOn);
    }

    [Fact]
    public void NewAccount_LeavesCreatedByUnset_ForDataOwnerHookToStampOnSave()
    {
        // DRK-1372 §5/R1: the constructor takes no acting-user parameter any more. CreatedBy is left unset
        // here and stamped on save by DataOwnerHook/PrincipalProvider instead — never assigned in-process.
        var account = NewAccount();

        account.CreatedBy.ShouldBeNullOrEmpty();
    }

    [Fact]
    public void Constructor_Throws_WhenPermittedNegativeWithNoOverdraftLimit()
    {
        // R3: this is the last line of defence, not the primary refusal path — the AppServices handler
        // validates via AccountFloorPolicy before ever constructing the entity (§7 "must state how far").
        Should.Throw<InvalidOperationException>(() => NewAccount(permittedToGoNegative: true, overdraftLimit: null));
    }

    [Fact]
    public void Constructor_AllowsPermittedNegative_WhenOverdraftLimitStated()
    {
        var account = NewAccount(permittedToGoNegative: true, overdraftLimit: 20m);

        account.PermittedToGoNegative.ShouldBeTrue();
        account.OverdraftLimit.ShouldBe(20m);
    }

    [Fact]
    public void ChangeDetails_AppliesEveryMemberSupplied()
    {
        var account = NewAccount();
        var metadata = new Dictionary<string, string> { ["region"] = "SG" };

        account.ChangeDetails("New Name", metadata);

        account.Name.ShouldBe("New Name");
        account.Metadata.ShouldBe(metadata);
    }

    [Theory]
    [InlineData(AccountStatus.Frozen)]
    [InlineData(AccountStatus.Dormant)]
    public void ChangeStatus_ToANonClosedStatus_LeavesClosedOnUnset(AccountStatus status)
    {
        var account = NewAccount();

        account.ChangeStatus(status);

        account.Status.ShouldBe(status);
        account.ClosedOn.ShouldBeNull();
    }

    [Fact]
    public void ChangeStatus_ToClosed_StampsClosedOn()
    {
        var account = NewAccount();

        account.ChangeStatus(AccountStatus.Closed);

        account.Status.ShouldBe(AccountStatus.Closed);
        account.ClosedOn.ShouldNotBeNull();
    }

    [Fact]
    public void ChangeStatus_LeavesUpdatedByUnset_ForDataOwnerHookToStampOnSave()
    {
        var account = NewAccount();

        account.ChangeStatus(AccountStatus.Closed);

        account.UpdatedBy.ShouldBeNullOrEmpty();
    }

    [Fact]
    public void ChangeStatus_ReopeningFromClosed_ClearsClosedOn()
    {
        // R9: Closed -> Active (reopening) is permitted.
        var account = NewAccount();
        account.ChangeStatus(AccountStatus.Closed);

        account.ChangeStatus(AccountStatus.Active);

        account.Status.ShouldBe(AccountStatus.Active);
        account.ClosedOn.ShouldBeNull();
    }

    [Fact]
    public void ChangeOverdraftLimit_ReplacesTheValue()
    {
        var account = NewAccount(permittedToGoNegative: true, overdraftLimit: 20m);

        account.ChangeOverdraftLimit(50m);

        account.OverdraftLimit.ShouldBe(50m);
    }

    [Fact]
    public void ChangeOverdraftLimit_LeavesUpdatedByUnset_ForDataOwnerHookToStampOnSave()
    {
        var account = NewAccount(permittedToGoNegative: true, overdraftLimit: 20m);

        account.ChangeOverdraftLimit(50m);

        account.UpdatedBy.ShouldBeNullOrEmpty();
    }

    [Fact]
    public void ChangeMinimumBalance_ReplacesTheValue()
    {
        var account = NewAccount();

        account.ChangeMinimumBalance(10m);

        account.MinimumBalance.ShouldBe(10m);
    }

    [Fact]
    public void ChangeMinimumBalance_LeavesUpdatedByUnset_ForDataOwnerHookToStampOnSave()
    {
        var account = NewAccount();

        account.ChangeMinimumBalance(10m);

        account.UpdatedBy.ShouldBeNullOrEmpty();
    }

    [Fact]
    public void ChangeDetails_LeavesANullMemberAlone()
    {
        // Partial update: null means "not supplied", never "clear it" — which is why
        // ChangeDetailsAccountRequestValidator refuses a body with every member null.
        var account = NewAccount();
        var originalName = account.Name;

        account.ChangeDetails(name: null, metadata: new Dictionary<string, string> { ["region"] = "SG" });

        account.Name.ShouldBe(originalName);
        account.Metadata!["region"].ShouldBe("SG");
    }

    [Fact]
    public void TryApplyPosting_ACredit_AllocatesPositionOneAndRaisesTheBalance()
    {
        var account = NewAccount();
        var postedAt = DateTimeOffset.UtcNow;

        var result = account.TryApplyPosting(isDebit: false, amount: 100m, postedAt: postedAt);

        result.Success.ShouldBeTrue();
        result.Refusal.ShouldBe(PostingRefusalReason.None);
        result.Position.ShouldBe(1);
        result.SignedValue.ShouldBe(100m);
        result.BalanceAfter.ShouldBe(100m);
        account.Balance.ShouldBe(100m);
        account.StreamPosition.ShouldBe(1);
        account.LastPostedOn.ShouldBe(postedAt);
    }

    [Fact]
    public void TryApplyPosting_TwoPostings_AllocateConsecutivePositions()
    {
        var account = NewAccount();

        account.TryApplyPosting(isDebit: false, amount: 100m, postedAt: DateTimeOffset.UtcNow);
        var second = account.TryApplyPosting(isDebit: true, amount: 30m, postedAt: DateTimeOffset.UtcNow);

        second.Position.ShouldBe(2);
        second.BalanceAfter.ShouldBe(70m);
        account.Balance.ShouldBe(70m);
    }

    [Fact]
    public void TryApplyPosting_BelowTheFloor_RefusesAndChangesNothing()
    {
        var account = NewAccount(permittedToGoNegative: false);

        var result = account.TryApplyPosting(isDebit: true, amount: 10m, postedAt: DateTimeOffset.UtcNow);

        result.Success.ShouldBeFalse();
        result.Refusal.ShouldBe(PostingRefusalReason.BelowFloor);
        account.Balance.ShouldBe(0m);
        account.StreamPosition.ShouldBe(0);
        account.LastPostedOn.ShouldBeNull();
    }

    [Fact]
    public void TryApplyPosting_AReversalBelowTheFloor_IsExemptFromTheFloorCheck()
    {
        var account = NewAccount(permittedToGoNegative: false);

        var result = account.TryApplyPosting(isDebit: true, amount: 10m, postedAt: DateTimeOffset.UtcNow, isReversal: true);

        result.Success.ShouldBeTrue();
        account.Balance.ShouldBe(-10m);
    }

    [Theory]
    [InlineData(AccountStatus.Closed, PostingRefusalReason.AccountClosed)]
    [InlineData(AccountStatus.Frozen, PostingRefusalReason.AccountFrozen)]
    public void TryApplyPosting_ClosedOrFrozen_RefusesEvenAReversal(AccountStatus status, PostingRefusalReason expected)
    {
        var account = NewAccount();
        account.ChangeStatus(status);

        var result = account.TryApplyPosting(isDebit: false, amount: 10m, postedAt: DateTimeOffset.UtcNow, isReversal: true);

        result.Success.ShouldBeFalse();
        result.Refusal.ShouldBe(expected);
        account.Balance.ShouldBe(0m);
    }

    [Fact]
    public void TryApplyPosting_DormantAccount_RefusesADebitButAllowsAReversalCredit()
    {
        var account = NewAccount();
        account.ChangeStatus(AccountStatus.Dormant);

        var debit = account.TryApplyPosting(isDebit: true, amount: 10m, postedAt: DateTimeOffset.UtcNow);
        debit.Success.ShouldBeFalse();
        debit.Refusal.ShouldBe(PostingRefusalReason.AccountDormantDebitRefused);

        var creditReversal = account.TryApplyPosting(isDebit: false, amount: 10m, postedAt: DateTimeOffset.UtcNow, isReversal: true);
        creditReversal.Success.ShouldBeTrue();
        account.Balance.ShouldBe(10m);
    }
}

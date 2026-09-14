using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.App.Tests.Unit.Domains;

/// <summary>
/// The signed-value rule (Asset/Expense: debit increases, credit decreases; Liability/Equity/Income: credit
/// increases, debit decreases) and the status gate (closed/frozen refuse either direction; dormant refuses
/// only a debit), each as pure functions.
/// </summary>
public class AccountPostingPolicyTests
{
    [Theory]
    [InlineData(AccountClassification.Asset, false, -10)] // credit decreases an asset
    [InlineData(AccountClassification.Asset, true, 10)] // debit increases an asset
    [InlineData(AccountClassification.Expense, false, -10)]
    [InlineData(AccountClassification.Expense, true, 10)]
    [InlineData(AccountClassification.Liability, false, 10)] // credit increases a liability
    [InlineData(AccountClassification.Liability, true, -10)] // debit decreases a liability
    [InlineData(AccountClassification.Equity, false, 10)]
    [InlineData(AccountClassification.Equity, true, -10)]
    [InlineData(AccountClassification.Income, false, 10)]
    [InlineData(AccountClassification.Income, true, -10)]
    public void SignedValue_FollowsTheClassificationRule(AccountClassification classification, bool isDebit, decimal expected) =>
        AccountPostingPolicy.SignedValue(classification, isDebit, 10m).ShouldBe(expected);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void StatusGate_ClosedAccount_RefusesEitherDirection(bool isDebit) =>
        AccountPostingPolicy.StatusGate(AccountStatus.Closed, isDebit).ShouldBe(PostingRefusalReason.AccountClosed);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void StatusGate_FrozenAccount_RefusesEitherDirection(bool isDebit) =>
        AccountPostingPolicy.StatusGate(AccountStatus.Frozen, isDebit).ShouldBe(PostingRefusalReason.AccountFrozen);

    [Fact]
    public void StatusGate_DormantAccount_RefusesOnlyADebit() =>
        AccountPostingPolicy.StatusGate(AccountStatus.Dormant, isDebit: true)
            .ShouldBe(PostingRefusalReason.AccountDormantDebitRefused);

    [Fact]
    public void StatusGate_DormantAccount_AllowsACredit() =>
        AccountPostingPolicy.StatusGate(AccountStatus.Dormant, isDebit: false).ShouldBe(PostingRefusalReason.None);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void StatusGate_ActiveAccount_AllowsEitherDirection(bool isDebit) =>
        AccountPostingPolicy.StatusGate(AccountStatus.Active, isDebit).ShouldBe(PostingRefusalReason.None);
}

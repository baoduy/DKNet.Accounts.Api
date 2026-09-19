using DKNet.Accounts.Domains.Share;

namespace DKNet.Accounts.App.Tests.Unit.Postings;

/// <summary>
/// The two @unit scenarios (DRK-1250 §7) drive <see cref="PostingAmount"/> directly, with no host.
/// <see cref="PostingAmount.Validate"/> is signature-only (§5) — every call throws
/// <see cref="NotImplementedException"/>, which is the nameable red reason (R2).
/// </summary>
public class PostingAmountValidationTests
{
    [Fact]
    public void An_amount_finer_than_its_currency_permits_is_not_a_valid_posting_amount()
    {
        // Given USD is denominated to two decimal places
        const int usdDecimalPlaces = 2;

        // When the amount 10.555 USD is checked against that currency
        // Then it is rejected as finer than USD permits — not implemented yet, so this call throws
        // and the test goes red for that reason rather than asserting the rejection.
        PostingAmount.Validate(10.555m, usdDecimalPlaces).ShouldBe(PostingAmountValidation.PrecisionExceeded);
    }

    [Fact]
    public void A_posting_amount_must_be_greater_than_zero()
    {
        // When the amounts 0.00 SGD and -5.00 SGD are each checked as a posting amount
        // Then both are rejected as not greater than zero — not implemented yet, so each call throws.
        const int sgdDecimalPlaces = 2;
        PostingAmount.Validate(0.00m, sgdDecimalPlaces).ShouldBe(PostingAmountValidation.NotPositive);
        PostingAmount.Validate(-5.00m, sgdDecimalPlaces).ShouldBe(PostingAmountValidation.NotPositive);
    }
}

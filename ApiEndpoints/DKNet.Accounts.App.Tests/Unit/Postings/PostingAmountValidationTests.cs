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

    // DRK-1719: numeric(18,6) holds 12 whole digits and 6 decimal places.
    [Fact]
    public void The_ceiling_is_twelve_nines_and_six_nines() =>
        PostingAmount.Ceiling.ShouldBe(999_999_999_999.999999m);

    [Theory]
    [InlineData("999999999999.999999", false)]
    [InlineData("-999999999999.999999", false)]
    [InlineData("1000000000000", true)]
    [InlineData("-1000000000000", true)]
    [InlineData("0", false)]
    public void An_amount_exceeds_the_ceiling_only_when_further_from_zero_than_it(string amount, bool exceeds) =>
        PostingAmount.ExceedsCeiling(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture)).ShouldBe(exceeds);

    [Theory]
    [InlineData("10.50", 1, true)]
    [InlineData("10.123", 2, false)]
    [InlineData("1250.123456", 6, true)]
    [InlineData("1.2345678", 6, false)]
    [InlineData("5000", 0, true)]
    public void Trailing_zeros_never_count_as_decimal_places(string amount, int places, bool fits) =>
        PostingAmount.HasAtMostPlaces(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture), places).ShouldBe(fits);
}

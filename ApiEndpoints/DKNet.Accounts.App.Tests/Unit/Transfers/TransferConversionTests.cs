using System.Globalization;
using DKNet.Accounts.AppServices.Transfers.V1;

namespace DKNet.Accounts.App.Tests.Unit.Transfers;

/// <summary>DRK-2276 §5, "The converted amount is rounded half away from zero to the destination currency"
/// (@unit). One row per Examples row; the values are the spec's literals. The destination's decimal places are
/// those of the seeded currency each row names (USD, SGD and EUR all carry 2).</summary>
public sealed class TransferConversionTests
{
    private static readonly IReadOnlyDictionary<string, int> DecimalPlaces = new Dictionary<string, int>
    {
        ["USD"] = 2,
        ["SGD"] = 2,
        ["EUR"] = 2
    };

    [Theory]
    [InlineData("100.00", "2.00", "USD", "0.74", "72.52")]
    [InlineData("33.33", "0.00", "USD", "0.74371", "24.79")]
    // 14.785 — half away from zero gives 14.79; banker's rounding would give 14.78.
    [InlineData("10.00", "0.00", "SGD", "1.4785", "14.79")]
    [InlineData("1000000", "0", "EUR", "0.00003445", "34.45")]
    [InlineData("100.00", "2.00", "SGD", null, "98.00")]
    public void TheConvertedAmountIsRoundedHalfAwayFromZeroToTheDestinationCurrency(
        string amount, string fee, string destination, string? rate, string converted)
    {
        var received = TransferConversion.Convert(
            Decimal(amount), Decimal(fee), rate is null ? null : Decimal(rate), DecimalPlaces[destination]);

        received.ShouldBe(Decimal(converted));
    }

    private static decimal Decimal(string text) => decimal.Parse(text, CultureInfo.InvariantCulture);
}

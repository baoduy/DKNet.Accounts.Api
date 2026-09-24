using System.Globalization;
using DKNet.Accounts.AppServices.Accounts.V1;
using DKNet.Accounts.AppServices.Accounts.V1.Actions;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Unit.Share;

/// <summary>DRK-1719 §3 row 11: every amount written with exactly its currency's decimal places.</summary>
public class CurrencyScaleJsonTests
{
    private static readonly Dictionary<string, int> Places = new() { ["SGD"] = 2, ["JPY"] = 0, ["USDT"] = 6 };

    private static readonly JsonSerializerOptions Options = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    }.UseCurrencyScale(code => Places.TryGetValue(code, out var places) ? places : null);

    private static string Balance(string currency, decimal balance) =>
        JsonSerializer.SerializeToElement(
                new AccountBalanceDto { Currency = currency, Balance = balance }, Options)
            .GetProperty("balance").GetRawText();

    private static decimal Parse(string value) => decimal.Parse(value, CultureInfo.InvariantCulture);

    [Theory]
    [InlineData("SGD", "12400.000000", "12400.00")]
    [InlineData("SGD", "12400", "12400.00")]
    [InlineData("JPY", "5000.000000", "5000")]
    [InlineData("USDT", "1.5", "1.500000")]
    [InlineData("USDT", "-0.000001", "-0.000001")]
    public void AnAmount_IsWrittenWithItsCurrencysDecimalPlaces(string currency, string stored, string stated) =>
        Balance(currency, Parse(stored)).ShouldBe(stated);

    [Fact]
    public void AnAmountFinerThanItsCurrency_IsWrittenAsItIs_NeverRounded() =>
        Balance("SGD", 1.234m).ShouldBe("1.234");

    [Fact]
    public void AnUnknownCurrency_LeavesTheAmountAsStored() =>
        Balance("ZZZ", 1.500000m).ShouldBe("1.500000");

    [Fact]
    public void ANullableAmount_IsScaledWhenSetAndStillOmittedWhenNull()
    {
        var withLimit = JsonSerializer.SerializeToElement(Account(overdraftLimit: 100m), Options);
        withLimit.GetProperty("overdraftLimit").GetRawText().ShouldBe("100.00");

        var withoutLimit = JsonSerializer.SerializeToElement(Account(overdraftLimit: null), Options);
        withoutLimit.TryGetProperty("overdraftLimit", out _).ShouldBeFalse();
    }

    [Fact]
    public void EveryAmountOnAPosting_IsScaled()
    {
        var posting = JsonSerializer.SerializeToElement(
            new AutoFaker<PostingDto>()
                .RuleFor(p => p.Currency, "USDT")
                .RuleFor(p => p.Amount, 10.5m)
                .RuleFor(p => p.SignedAmount, -10.5m)
                .RuleFor(p => p.BalanceAfter, 0m)
                .RuleFor(p => p.EffectiveDate, new DateOnly(2026, 9, 1))
                .RuleFor(p => p.Metadata, (IReadOnlyDictionary<string, string>?)null)
                .Generate(),
            Options);

        posting.GetProperty("amount").GetRawText().ShouldBe("10.500000");
        posting.GetProperty("signedAmount").GetRawText().ShouldBe("-10.500000");
        posting.GetProperty("balanceAfter").GetRawText().ShouldBe("0.000000");
    }

    [Fact]
    public void ATypeFromAnotherAssembly_IsLeftAlone() =>
        JsonSerializer.SerializeToElement(new ForeignAmount("SGD", 1.5m), Options)
            .GetProperty("amount").GetRawText().ShouldBe("1.5");

    [Fact]
    public void AnApplicationTypeWithNoCurrency_IsLeftAlone() =>
        JsonSerializer.SerializeToElement(new UpdateAccountRequest { MinimumBalance = 1.5m }, Options)
            .GetProperty("minimumBalance").GetRawText().ShouldBe("1.5");

    [Fact]
    public void AResolverAlreadyInPlace_KeepsItsOwnModifiers()
    {
        var options = new JsonSerializerOptions
        {
            TypeInfoResolver = new System.Text.Json.Serialization.Metadata.DefaultJsonTypeInfoResolver
            {
                Modifiers = { typeInfo => { foreach (var p in typeInfo.Properties) p.Name = p.Name.ToUpperInvariant(); } }
            }
        }.UseCurrencyScale(_ => 2);

        JsonSerializer.SerializeToElement(new AccountBalanceDto { Currency = "SGD", Balance = 1m }, options)
            .GetProperty("BALANCE").GetRawText().ShouldBe("1.00");
    }

    [Theory]
    [InlineData("1.5", 6, "1.500000")]
    [InlineData("12400.000000", 2, "12400.00")]
    [InlineData("5000.000000", 0, "5000")]
    public void ToScale_SetsExactlyTheGivenScale(string value, int places, string expected) =>
        CurrencyScaleJson.ToScale(Parse(value), places).ToString(CultureInfo.InvariantCulture).ShouldBe(expected);

    private static AccountDto Account(decimal? overdraftLimit) => new AutoFaker<AccountDto>()
        .RuleFor(a => a.Currency, "SGD")
        .RuleFor(a => a.OverdraftLimit, overdraftLimit)
        .RuleFor(a => a.Metadata, (IReadOnlyDictionary<string, string>?)null)
        .Generate();

    // Outside the application assembly the modifier applies to, with the same shape as one of its DTOs.
    public sealed record ForeignAmount(string Currency, decimal Amount);
}

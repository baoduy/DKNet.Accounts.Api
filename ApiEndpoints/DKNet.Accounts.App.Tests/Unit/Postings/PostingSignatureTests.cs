using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.App.Tests.Unit.Postings;

/// <summary>
/// The idempotency content-equality rule: two requests are "the same request, replayed" only when every
/// meaningful field agrees; any one of them differing makes it a genuinely different request reusing the
/// same key (409 IDEMPOTENCY_KEY_CONFLICT at the handler level).
/// </summary>
public class PostingSignatureTests
{
    private static readonly Guid AccountId = Guid.NewGuid();
    private static readonly DateOnly EffectiveDate = new(2026, 6, 1);

    private static string Signature(decimal amount = 100m, string? description = "inv-1", string currency = "SGD") =>
        PostingSignature.Compute(
            AccountId, PostingDirection.Credit, amount, currency, PostingCategory.Transfer, EffectiveDate,
            description, null, null, null, null);

    [Fact]
    public void IdenticalInputs_ProduceTheSameSignature() =>
        Signature().ShouldBe(Signature());

    [Fact]
    public void ADifferentAmount_ProducesADifferentSignature() =>
        Signature(amount: 100m).ShouldNotBe(Signature(amount: 100.01m));

    [Fact]
    public void ADifferentDescription_ProducesADifferentSignature() =>
        Signature(description: "inv-1").ShouldNotBe(Signature(description: "inv-2"));

    [Fact]
    public void ADifferentCurrency_ProducesADifferentSignature() =>
        Signature(currency: "SGD").ShouldNotBe(Signature(currency: "USD"));

    [Fact]
    public void MetadataOrder_DoesNotAffectTheSignature()
    {
        var a = PostingSignature.Compute(
            AccountId, PostingDirection.Credit, 100m, "SGD", PostingCategory.Transfer, EffectiveDate,
            null, null, null, null,
            new Dictionary<string, string> { ["a"] = "1", ["b"] = "2" });
        var b = PostingSignature.Compute(
            AccountId, PostingDirection.Credit, 100m, "SGD", PostingCategory.Transfer, EffectiveDate,
            null, null, null, null,
            new Dictionary<string, string> { ["b"] = "2", ["a"] = "1" });

        a.ShouldBe(b);
    }

    [Fact]
    public void DifferentMetadataValues_ProduceADifferentSignature()
    {
        var a = PostingSignature.Compute(
            AccountId, PostingDirection.Credit, 100m, "SGD", PostingCategory.Transfer, EffectiveDate,
            null, null, null, null, new Dictionary<string, string> { ["a"] = "1" });
        var b = PostingSignature.Compute(
            AccountId, PostingDirection.Credit, 100m, "SGD", PostingCategory.Transfer, EffectiveDate,
            null, null, null, null, new Dictionary<string, string> { ["a"] = "2" });

        a.ShouldNotBe(b);
    }

    private static string AsWritten(decimal amount) =>
        PostingSignature.ComputeAsWritten(
            AccountId, PostingDirection.Credit, amount, "SGD", PostingCategory.Transfer, EffectiveDate,
            "inv-1", null, null, null, null);

    // DRK-1719: the stored signature compares the amount by value.
    [Theory]
    [InlineData("10.50")]
    [InlineData("10.500000")]
    public void TrailingZeros_DoNotAffectTheSignature(string resent) =>
        Signature(amount: decimal.Parse(resent, System.Globalization.CultureInfo.InvariantCulture)).ShouldBe(Signature(amount: 10.5m));

    [Fact]
    public void ATrailingZeroOnAWholeAmount_DoesNotAffectTheSignature() =>
        Signature(amount: 100.00m).ShouldBe(Signature(amount: 100m));

    [Fact]
    public void TheAsWrittenSignature_StillTellsTrailingZerosApart() =>
        AsWritten(10.50m).ShouldNotBe(AsWritten(10.5m));

    [Fact]
    public void WithNoTrailingZero_TheSignatureEqualsTheOneStoredBeforeTheChange() =>
        Signature(amount: 10.5m).ShouldBe(AsWritten(10.5m));

    [Fact]
    public void TheAsWrittenSignature_IsTheOneComputedBeforeTheChange()
    {
        // Frozen literal: PostingSignature.Compute at base 190ff1a over this exact request (the same request
        // CurrencySetAndUsdtSteps.PreUpgradeSignature pins).
        var signature = PostingSignature.ComputeAsWritten(
            new Guid("a0000000-0000-4000-8000-000000006650"), PostingDirection.Credit, 10.5m, "SGD",
            PostingCategory.Transfer, new DateOnly(2026, 9, 1), null, null, null, null, null);

        signature.ShouldBe("D254960E4F584B1D8B45489FE7D3A4F80C4376902D71529892152203CB3E75C3");
    }

    [Fact]
    public void TheAsWrittenSignature_HashesTheRequestAsCanonicalJson_WithMetadataInKeyOrder()
    {
        // The canonical shape, written out by hand: enums as numbers, metadata keys in ordinal order.
        const string json = """
            {"accountId":"a0000000-0000-4000-8000-000000000001","direction":0,"amount":10.50,"currency":"SGD","category":0,"effectiveDate":"2026-09-01","description":null,"counterpartyAccountId":null,"counterpartyReference":null,"externalReference":null,"metadata":{"a":"1","b":"2"}}
            """;
        var expected = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(json)));

        var signature = PostingSignature.ComputeAsWritten(
            new Guid("a0000000-0000-4000-8000-000000000001"), PostingDirection.Credit, 10.50m, "SGD",
            PostingCategory.Transfer, new DateOnly(2026, 9, 1), null, null, null, null,
            new Dictionary<string, string> { ["b"] = "2", ["a"] = "1" });

        signature.ShouldBe(expected);
    }
}

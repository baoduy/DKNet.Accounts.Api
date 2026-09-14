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
}

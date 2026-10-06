using System.Globalization;
using DKNet.Accounts.AppServices.Postings.V1.Actions;

namespace DKNet.Accounts.App.Tests.Unit.Postings;

/// <summary>
/// DRK-2120 surface B §6a D1, D3 and D4 for each of the 3 requests that carry an idempotency key: the key is
/// lowercased culture-invariantly when it is set, and an absent key stays absent. IdempotencyKeyCase.feature
/// proves the Turkish rule end to end for record only; these pin it for record batch and reverse as well.
/// </summary>
public class IdempotencyKeyLowercasingTests
{
    public static TheoryData<string, string?, string?> Keys => new()
    {
        { "record", "Pay-ABC-01", "pay-abc-01" },
        { "batch", "Pay-ABC-01", "pay-abc-01" },
        { "reverse", "Pay-ABC-01", "pay-abc-01" },
        { "record", null, null },
        { "batch", null, null },
        { "reverse", null, null }
    };

    public static TheoryData<string> Requests => new() { "record", "batch", "reverse" };

    [Theory]
    [MemberData(nameof(Keys))]
    public void IdempotencyKey_WhenSet_IsStoredLowercased(string request, string? sent, string? expected) =>
        SetKey(request, sent).ShouldBe(expected);

    [Theory]
    [MemberData(nameof(Requests))]
    public void IdempotencyKey_WhenSetUnderTurkishCulture_IsLowercasedInvariantly(string request)
    {
        var culture = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("tr-TR");
        try
        {
            // Precondition: a culture-sensitive lowercase differs here, so the assertion can tell the two apart.
            "TITLE".ToLower(CultureInfo.CurrentCulture).ShouldBe("tıtle");

            SetKey(request, "TITLE").ShouldBe("title");
        }
        finally
        {
            CultureInfo.CurrentCulture = culture;
        }
    }

    private static string? SetKey(string request, string? key) => request switch
    {
        "record" => new RecordPostingRequest { IdempotencyKey = key }.IdempotencyKey,
        "batch" => new RecordPostingBatchRequest { IdempotencyKey = key }.IdempotencyKey,
        "reverse" => new ReversePostingRequest { IdempotencyKey = key }.IdempotencyKey,
        _ => throw new ArgumentOutOfRangeException(nameof(request), request, null)
    };
}

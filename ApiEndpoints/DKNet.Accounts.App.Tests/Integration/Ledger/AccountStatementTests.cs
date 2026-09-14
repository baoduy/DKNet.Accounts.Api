using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// Rework finding 2: <c>GetAccountStatement</c>/<c>SpecGetPosting</c> had no assertion-carrying test anywhere
/// (<c>grep -rn "[Ss]tatement" ApiEndpoints/DKNet.Accounts.App.Tests/</c> returned nothing before this file).
/// Covers the four unverified behaviors the review named: a date-bounded read returns exactly the in-range
/// postings, a backdated posting is still read AFTER an earlier-recorded one (stream order, not date order),
/// paging partitions the stream correctly with no repeats and no gaps, and a page past the end comes back as
/// an empty 200 rather than an error.
/// </summary>
public sealed class AccountStatementTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    private HttpClient Client => fixture.CreateClient();

    private static HttpRequestMessage AsPayHub(HttpMethod method, string uri, object? body = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
        request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', ScopeNames.All));
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    private async Task<Guid> OpenAccountAsync()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = Guid.NewGuid(),
            name = "Operating",
            currency = "SGD",
            classification = "Liability",
            permittedToGoNegative = false
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    private async Task<Guid> RecordAsync(Guid accountId, DateOnly effectiveDate)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId,
            direction = "Credit",
            amount = 10m,
            currency = "SGD",
            category = "Transfer",
            effectiveDate
        }));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    private async Task<JsonElement> ReadStatementAsync(Guid accountId, string query = "")
    {
        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Get, $"{AccountsPath}/{accountId}/statement{query}"));
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task Statement_DateBounded_ReturnsExactlyTheInRangePostings()
    {
        var account = await OpenAccountAsync();
        var inRange1 = await RecordAsync(account, new DateOnly(2026, 1, 1));
        var inRange2 = await RecordAsync(account, new DateOnly(2026, 1, 15));
        await RecordAsync(account, new DateOnly(2026, 2, 1)); // out of range: excluded

        var doc = await ReadStatementAsync(account, "?from=2026-01-01&to=2026-01-31");

        var ids = doc.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetGuid()).ToList();
        ids.ShouldBe([inRange1, inRange2]);
    }

    [Fact]
    public async Task Statement_ABackdatedPosting_IsReadAfterAnEarlierRecordedOne_StreamOrderNotDateOrder()
    {
        var account = await OpenAccountAsync();

        // Recorded FIRST, dated LATER.
        var recordedFirst = await RecordAsync(account, new DateOnly(2026, 1, 20));
        // Recorded SECOND, backdated EARLIER than the one above.
        var recordedSecondButBackdated = await RecordAsync(account, new DateOnly(2026, 1, 10));

        var doc = await ReadStatementAsync(account, "?from=2026-01-01&to=2026-01-31");

        var ids = doc.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetGuid()).ToList();
        // If this read effective-date order instead of stream order, the backdated posting (1/10) would come
        // first — it does not: recording order wins.
        ids.ShouldBe([recordedFirst, recordedSecondButBackdated]);
    }

    [Fact]
    public async Task Statement_PagedInTensOverTwentyFivePostings_ReturnsEveryPostingExactlyOnceInStreamOrder()
    {
        var account = await OpenAccountAsync();
        var created = new List<Guid>();
        for (var day = 1; day <= 25; day++)
        {
            created.Add(await RecordAsync(account, new DateOnly(2026, 3, day)));
        }

        var page1 = await ReadStatementAsync(account, "?from=2026-03-01&to=2026-03-31&pageIndex=1&pageSize=10");
        var page2 = await ReadStatementAsync(account, "?from=2026-03-01&to=2026-03-31&pageIndex=2&pageSize=10");
        var page3 = await ReadStatementAsync(account, "?from=2026-03-01&to=2026-03-31&pageIndex=3&pageSize=10");

        var page1Ids = page1.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetGuid()).ToList();
        var page2Ids = page2.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetGuid()).ToList();
        var page3Ids = page3.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetGuid()).ToList();

        page1Ids.Count.ShouldBe(10);
        page2Ids.Count.ShouldBe(10);
        page3Ids.Count.ShouldBe(5);

        var allIds = page1Ids.Concat(page2Ids).Concat(page3Ids).ToList();
        allIds.ShouldBe(created); // exact stream order, across every page, no repeats, none missing
        allIds.Distinct().Count().ShouldBe(25);

        // Page past the end: 200 with an empty items array, not an error.
        var page4 = await ReadStatementAsync(account, "?from=2026-03-01&to=2026-03-31&pageIndex=4&pageSize=10");
        page4.GetProperty("items").GetArrayLength().ShouldBe(0);
    }
}

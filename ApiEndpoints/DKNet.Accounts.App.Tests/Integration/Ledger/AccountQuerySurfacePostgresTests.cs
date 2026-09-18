using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json.Serialization;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Accounts.V1;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// pr-reviewer, round 1 — `blocking`: <c>GET /v1/accounts</c>'s generic <c>orderBy</c>/<c>filter</c> surface
/// is open to every field <see cref="AccountDto"/> declares (DRK-1277 §11/§12 moved this route onto the
/// generic list mapper), and nothing exercised it — the BDD steps only ever send the three filters the old
/// hand-written route had. That gap is exactly why `AccountDto.AvailableBalance`/`OpenedOn` — computed,
/// unmapped entity members that pass field-name validation and then fail EF translation — 500'd instead of
/// 400ing, undetected through 312 + 62 passing tests. Runs against REAL PostgreSQL (see
/// <see cref="AccountReadPathsPostgresTests"/> for why): EF Core InMemory's client-side evaluation is lax
/// enough that it may not reproduce a translation failure a real relational provider throws on.
/// </summary>
/// <remarks>
/// pr-reviewer, round 2 — `nit`: a bare <c>ShouldBeLessThan(500)</c> pins "never crashes" but not "still
/// works" — every case would still pass if a field silently degraded from 200 to 400 (exactly how <c>?currency=</c>
/// was lost in round 1). Split into <see cref="AcceptedFields"/> (must resolve, 200) and
/// <see cref="RejectedFields"/> (deliberately unresolvable, 400) so both directions are pinned. The list is
/// still reflection-derived from <see cref="AccountDto"/> (skipping <see cref="JsonIgnoreAttribute"/> members,
/// which are query-surface-only, never caller-visible) minus the three known renamed/computed members that
/// belong in the rejected bucket — so a newly added plain field is automatically covered as accepted.
/// </remarks>
public sealed class AccountQuerySurfacePostgresTests(PostgresLedgerApiFixture fixture)
    : IClassFixture<PostgresLedgerApiFixture>
{
    private const string AccountsPath = "/v1/accounts";
    private const string SeededCurrency = "SGD";

    private static readonly string[] RejectedFieldNames =
    [
        nameof(AccountDto.Currency), nameof(AccountDto.AvailableBalanceAmount), nameof(AccountDto.AccountOpenedOn)
    ];

    private HttpClient Client => fixture.CreateClient();

    private static IEnumerable<string> PublishedFieldNames() =>
        typeof(AccountDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.GetCustomAttribute<JsonIgnoreAttribute>() is null)
            .Select(p => p.Name);

    public static IEnumerable<object[]> AcceptedFields() =>
        PublishedFieldNames().Except(RejectedFieldNames).Select(n => new object[] { n });

    public static IEnumerable<object[]> RejectedFields() =>
        RejectedFieldNames.Select(n => new object[] { n });

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


    private Guid? _fixtureGroupId;

    /// <summary>A real group to open accounts into. Opening reads its group now — an account number is
    /// {group code}-{suffix} — so a fabricated group id is refused.</summary>
    private async Task<Guid> FixtureGroupIdAsync()
    {
        if (_fixtureGroupId is not null)
        {
            return _fixtureGroupId.Value;
        }

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, "/v1/account-groups", new
        {
            code = $"G{Guid.NewGuid():N}"[..5].ToUpperInvariant(),
            name = "Fixture Group",
            type = "Customer",
            ownerId = "PayHub"
        }));
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        _fixtureGroupId = created.GetProperty("id").GetGuid();
        return _fixtureGroupId.Value;
    }

    private async Task SeedOneAccountAsync(string currency = SeededCurrency)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = await FixtureGroupIdAsync(),
            name = "Operating",
            currency,
            classification = "Asset",
            permittedToGoNegative = false
        }));
        response.EnsureSuccessStatusCode();
    }

    [Theory]
    [MemberData(nameof(AcceptedFields))]
    public async Task OrderingByAnAcceptedField_Returns200(string field)
    {
        await SeedOneAccountAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}?orderBy={field}"));

        response.StatusCode.ShouldBe(HttpStatusCode.OK, $"orderBy={field} should resolve and sort.");
    }

    [Theory]
    [MemberData(nameof(AcceptedFields))]
    public async Task FilteringByAnAcceptedField_Returns200(string field)
    {
        await SeedOneAccountAsync();

        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Get, $"{AccountsPath}?filter={field}:IsNotNull"));

        response.StatusCode.ShouldBe(HttpStatusCode.OK, $"filter={field}:IsNotNull should resolve and filter.");
    }

    [Theory]
    [MemberData(nameof(RejectedFields))]
    public async Task OrderingByARejectedField_Returns400NeverServerError(string field)
    {
        await SeedOneAccountAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}?orderBy={field}"));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest,
            $"orderBy={field} is a computed/renamed member that must not reach EF translation.");
    }

    [Theory]
    [MemberData(nameof(RejectedFields))]
    public async Task FilteringByARejectedField_Returns400NeverServerError(string field)
    {
        await SeedOneAccountAsync();

        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Get, $"{AccountsPath}?filter={field}:IsNotNull"));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest,
            $"filter={field}:IsNotNull is a computed/renamed member that must not reach EF translation.");
    }

    /// <summary>
    /// pr-reviewer, round 2 — `important`: the restored <c>?currency=</c> dimension is the one caller-visible
    /// capability this round added, and it is also the one member <see cref="AcceptedFields"/> can't reach —
    /// <see cref="AccountDto.CurrencyCode"/> is <see cref="JsonIgnoreAttribute"/>, the exact condition the
    /// reflection sweep excludes by design. Asserts both the status code AND that the filter actually narrowed
    /// the result set (a status-only check would still pass if the filter were silently ignored) — so removing
    /// <see cref="AccountDto.CurrencyCode"/> turns this red instead of leaving <c>?currency=</c> to quietly
    /// disappear a second time.
    /// </summary>
    [Fact]
    public async Task FilteringByCurrencyCode_Returns200AndOnlyTheMatchingRow()
    {
        await SeedOneAccountAsync(SeededCurrency);
        await SeedOneAccountAsync("USD");

        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Get, $"{AccountsPath}?filter=CurrencyCode:Equal:{SeededCurrency}"));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var items = doc.RootElement.GetProperty("items").EnumerateArray().ToList();

        items.ShouldNotBeEmpty();
        items.ShouldAllBe(item => item.GetProperty("currency").GetString() == SeededCurrency);
    }
}

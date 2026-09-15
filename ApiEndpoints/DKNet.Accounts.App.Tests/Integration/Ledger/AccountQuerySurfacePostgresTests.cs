using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json.Serialization;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Accounts.V1;
using DKNet.Accounts.AppServices.Share;

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
/// Derives the field list from <see cref="AccountDto"/> itself via reflection (skipping
/// <see cref="JsonIgnoreAttribute"/> members, which are query-surface-only, never caller-visible) rather than
/// a hard-coded list — the mutation this must catch: a computed, unmapped entity member re-entering the
/// queryable set turns its row red instead of silently passing.
/// </remarks>
public sealed class AccountQuerySurfacePostgresTests(PostgresLedgerApiFixture fixture)
    : IClassFixture<PostgresLedgerApiFixture>
{
    private const string AccountsPath = "/v1/accounts";

    private HttpClient Client => fixture.CreateClient();

    public static IEnumerable<object[]> PublishedFields() =>
        typeof(AccountDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.GetCustomAttribute<JsonIgnoreAttribute>() is null)
            .Select(p => new object[] { p.Name });

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

    private async Task SeedOneAccountAsync()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = Guid.NewGuid(),
            name = "Operating",
            currency = "SGD",
            classification = "Asset",
            permittedToGoNegative = false
        }));
        response.EnsureSuccessStatusCode();
    }

    [Theory]
    [MemberData(nameof(PublishedFields))]
    public async Task OrderingByAnyPublishedField_NeverReturnsAServerError(string field)
    {
        await SeedOneAccountAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}?orderBy={field}"));

        ((int)response.StatusCode).ShouldBeLessThan(500,
            $"orderBy={field} returned {(int)response.StatusCode}; the field either sorts (200) or is " +
            "correctly rejected (400) — a 500 means an unmapped/computed member reached EF translation.");
    }

    [Theory]
    [MemberData(nameof(PublishedFields))]
    public async Task FilteringByAnyPublishedField_NeverReturnsAServerError(string field)
    {
        await SeedOneAccountAsync();

        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Get, $"{AccountsPath}?filter={field}:IsNotNull"));

        ((int)response.StatusCode).ShouldBeLessThan(500,
            $"filter={field}:IsNotNull returned {(int)response.StatusCode}; the field either filters (200) " +
            "or is correctly rejected (400) — a 500 means an unmapped/computed member reached EF translation.");
    }
}

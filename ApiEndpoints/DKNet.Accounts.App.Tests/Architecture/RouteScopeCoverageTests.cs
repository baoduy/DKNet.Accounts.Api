using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1277 §3 row 16: enumerates the live endpoint data source and asserts every one of the sixteen ledger
/// routes (§2) still carries the exact scope it names, whatever mechanism registered that route — hand-mapped
/// or generated. The regression this guards: a route silently losing its scope requirement because a future
/// change swaps a hand-mapped registration for one whose path never chains
/// <c>ConditionalScopeAuthorization.RequireScope</c> (or an equivalent).
/// </summary>
public sealed class RouteScopeCoverageTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string V1 = "/v{version:apiVersion}";

    private static readonly IReadOnlyDictionary<(string Method, string Path), string> ExpectedScopes =
        new Dictionary<(string, string), string>
        {
            [("POST", $"{V1}/account-groups/")] = ScopeNames.AccountsWrite,
            [("GET", $"{V1}/account-groups/")] = ScopeNames.AccountsRead,
            [("GET", $"{V1}/account-groups/{{id:guid}}")] = ScopeNames.AccountsRead,
            [("PATCH", $"{V1}/account-groups/{{id:guid}}")] = ScopeNames.AccountsWrite,
            [("GET", $"{V1}/account-groups/{{id:guid}}/balances")] = ScopeNames.AccountsRead,
            [("POST", $"{V1}/accounts/")] = ScopeNames.AccountsWrite,
            [("GET", $"{V1}/accounts/")] = ScopeNames.AccountsRead,
            [("GET", $"{V1}/accounts/{{id:guid}}")] = ScopeNames.AccountsRead,
            [("GET", $"{V1}/accounts/{{id:guid}}/balance")] = ScopeNames.AccountsRead,
            [("PATCH", $"{V1}/accounts/{{id:guid}}")] = ScopeNames.AccountsWrite,
            [("GET", $"{V1}/accounts/{{id:guid}}/statement")] = ScopeNames.PostingsRead,
            [("GET", $"{V1}/currencies/")] = ScopeNames.AccountsRead,
            [("POST", $"{V1}/postings/")] = ScopeNames.PostingsWrite,
            [("POST", $"{V1}/postings/batch")] = ScopeNames.PostingsWrite,
            [("GET", $"{V1}/postings/{{id:guid}}")] = ScopeNames.PostingsRead,
            [("POST", $"{V1}/postings/{{id:guid}}/reverse")] = ScopeNames.PostingsReverse
        };

    [Fact]
    public void EveryLedgerRoute_RequiresItsDocumentedScope()
    {
        _ = fixture.CreateClient(); // forces host start so the endpoint data source is built
        var dataSource = fixture.Services.GetRequiredService<EndpointDataSource>();
        var routeEndpoints = dataSource.Endpoints.OfType<RouteEndpoint>().ToList();

        var missing = new List<string>();
        var wrongScope = new List<string>();

        foreach (var ((method, path), expectedScope) in ExpectedScopes)
        {
            var endpoint = routeEndpoints.FirstOrDefault(e =>
                e.RoutePattern.RawText == path &&
                (e.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods.Contains(method) ?? false));

            if (endpoint is null)
            {
                missing.Add($"{method} {path}");
                continue;
            }

            var policies = endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>()
                .Select(a => a.Policy)
                .Where(p => p is not null)
                .ToList();

            if (!policies.Contains(expectedScope))
            {
                wrongScope.Add($"{method} {path} -> [{string.Join(", ", policies)}], expected {expectedScope}");
            }
        }

        missing.ShouldBeEmpty($"Routes not found in the live endpoint data source: {string.Join("; ", missing)}");
        wrongScope.ShouldBeEmpty($"Routes missing their documented scope: {string.Join("; ", wrongScope)}");
    }
}

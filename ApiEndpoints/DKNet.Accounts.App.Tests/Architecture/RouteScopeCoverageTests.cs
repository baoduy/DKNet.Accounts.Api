using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1277 §3 row 16 (tightened per §11/§12): enumerates the live endpoint data source and asserts every
/// ledger route still carries the exact scope it names, whatever mechanism registered that route —
/// hand-mapped or generated. The regression this guards: a route silently losing its scope requirement
/// because a future change swaps a hand-mapped registration for one whose path never chains
/// <c>ConditionalScopeAuthorization.RequireScope</c> (or an equivalent).
/// </summary>
/// <remarks>
/// Fails closed both ways (pr-reviewer, round 1): <see cref="ExpectedScopes"/> is walked to catch a
/// documented route losing its scope, and every live route under a ledger prefix is walked back against
/// <see cref="ExpectedScopes"/> to catch the opposite — a NEW route (e.g. anything ever routed through the
/// generated <c>Map{Entity}Crud</c> composite, whose <c>MapDeleteById</c> call this API never invokes today)
/// appearing with no entry, and therefore no asserted scope, at all.
/// </remarks>
public sealed class RouteScopeCoverageTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string V1 = "/v{version:apiVersion}";

    private static readonly string[] LedgerPathPrefixes =
    [
        $"{V1}/account-groups", $"{V1}/accounts", $"{V1}/postings", $"{V1}/currencies"
    ];

    private static readonly IReadOnlyDictionary<(string Method, string Path), string> ExpectedScopes =
        new Dictionary<(string, string), string>
        {
            [("POST", $"{V1}/account-groups/")] = ScopeNames.AccountsWrite,
            [("GET", $"{V1}/account-groups/")] = ScopeNames.AccountsRead,
            [("GET", $"{V1}/account-groups/{{id}}")] = ScopeNames.AccountsRead,
            [("PUT", $"{V1}/account-groups/{{id}}")] = ScopeNames.AccountsWrite,
            [("POST", $"{V1}/account-groups/{{id}}/close")] = ScopeNames.AccountsWrite,
            [("POST", $"{V1}/account-groups/{{id}}/activate")] = ScopeNames.AccountsWrite,
            [("DELETE", $"{V1}/account-groups/{{id}}")] = ScopeNames.AccountsWrite,
            [("GET", $"{V1}/account-groups/{{id:guid}}/balances")] = ScopeNames.AccountsRead,
            [("GET", $"{V1}/account-groups/status-counts")] = ScopeNames.AccountsRead,
            [("POST", $"{V1}/accounts/")] = ScopeNames.AccountsWrite,
            [("GET", $"{V1}/accounts/")] = ScopeNames.AccountsRead,
            [("GET", $"{V1}/accounts/{{id}}")] = ScopeNames.AccountsRead,
            [("GET", $"{V1}/accounts/{{id:guid}}/balance")] = ScopeNames.AccountsRead,
            [("GET", $"{V1}/accounts/status-counts")] = ScopeNames.AccountsRead,
            [("GET", $"{V1}/accounts/balances")] = ScopeNames.AccountsRead,
            [("PUT", $"{V1}/accounts/{{id}}")] = ScopeNames.AccountsWrite,
            [("PATCH", $"{V1}/accounts/{{id:guid}}")] = ScopeNames.AccountsWrite,
            [("GET", $"{V1}/accounts/{{id:guid}}/statement")] = ScopeNames.PostingsRead,
            [("GET", $"{V1}/currencies/")] = ScopeNames.AccountsRead,
            [("GET", $"{V1}/currencies/{{id}}")] = ScopeNames.AccountsRead,
            [("POST", $"{V1}/currencies/")] = ScopeNames.AccountsWrite,
            [("PUT", $"{V1}/currencies/{{id}}")] = ScopeNames.AccountsWrite,
            [("POST", $"{V1}/currencies/{{id}}/activate")] = ScopeNames.AccountsWrite,
            [("POST", $"{V1}/currencies/{{id}}/deactivate")] = ScopeNames.AccountsWrite,
            [("GET", $"{V1}/postings/")] = ScopeNames.PostingsRead,
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

        // Fail closed: a ledger route present in the live data source but absent from ExpectedScopes would
        // otherwise stay green with no scope assertion at all.
        var undocumented = new List<string>();
        foreach (var endpoint in routeEndpoints)
        {
            var path = endpoint.RoutePattern.RawText;
            if (path is null || !LedgerPathPrefixes.Any(prefix => path.StartsWith(prefix, StringComparison.Ordinal)))
            {
                continue;
            }

            var methods = endpoint.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods ?? [];
            foreach (var method in methods)
            {
                if (!ExpectedScopes.ContainsKey((method, path)))
                {
                    undocumented.Add($"{method} {path}");
                }
            }
        }

        undocumented.ShouldBeEmpty(
            $"Ledger routes present but not asserted by this test: {string.Join("; ", undocumented)}");
    }
}

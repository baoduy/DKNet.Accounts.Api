using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Microsoft.AspNetCore.Routing;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.Client;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>DRK-1638 §5, "Every live route of the service has exactly one client method" (@integration).
/// Walks <see cref="IAccountClient"/> by reflection over <see cref="AccountRouteAttribute"/> rather than a
/// second hand-kept route list — the same fail-both-ways shape as
/// <c>DKNet.Accounts.App.Tests.Architecture.RouteScopeCoverageTests</c>.</summary>
public sealed class RouteParityTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string V1 = "/v{version:apiVersion}";

    private static readonly string[] LedgerPathPrefixes =
    [
        $"{V1}/account-groups", $"{V1}/accounts", $"{V1}/postings", $"{V1}/currencies"
    ];

    [Fact]
    public void EveryLiveRouteHasExactlyOneClientMethod()
    {
        _ = fixture.CreateClient();
        var dataSource = fixture.Services.GetRequiredService<EndpointDataSource>();

        var liveRoutes = new HashSet<(string Method, string Path)>();
        foreach (var endpoint in dataSource.Endpoints.OfType<RouteEndpoint>())
        {
            var path = endpoint.RoutePattern.RawText;
            if (path is null || !LedgerPathPrefixes.Any(prefix => path.StartsWith(prefix, System.StringComparison.Ordinal)))
            {
                continue;
            }

            var methods = endpoint.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods ?? [];
            foreach (var method in methods)
            {
                liveRoutes.Add((method, path));
            }
        }

        var clientRoutes = typeof(IAccountClient).GetMethods()
            .Select(m => m.GetCustomAttribute<AccountRouteAttribute>())
            .Where(a => a is not null)
            .Select(a => (a!.Method, a.RawPattern))
            .ToHashSet();

        var routesWithNoMethod = liveRoutes.Except(clientRoutes).Select(r => $"{r.Item1} {r.Item2}").ToList();
        var methodsWithNoRoute = clientRoutes.Except(liveRoutes).Select(r => $"{r.Item1} {r.Item2}").ToList();

        routesWithNoMethod.ShouldBeEmpty($"live routes with no client method: {string.Join("; ", routesWithNoMethod)}");
        methodsWithNoRoute.ShouldBeEmpty($"client methods with no live route: {string.Join("; ", methodsWithNoRoute)}");
    }
}

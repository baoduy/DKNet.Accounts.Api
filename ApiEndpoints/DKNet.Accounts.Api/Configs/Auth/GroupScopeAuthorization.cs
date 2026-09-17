using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Authorization;

namespace DKNet.Accounts.Api.Configs.Auth;

/// <summary>
/// Declares, once per HTTP method, the scope every route in an endpoint group requires — unless the route
/// declares its own scope (<see cref="ConditionalScopeAuthorization.RequireScope{TBuilder}"/>) or is
/// anonymous. Several declarations may be added to one group: one per method, or one shared across several
/// (DRK-1498 §3 rows 1-2). Mirrors <see cref="ConditionalScopeAuthorization"/> — a no-op, declarations and
/// coverage check alike, whenever this host never wires up authorization at all (R3; in the shipped host that
/// happens exactly when <see cref="FeatureOptions.RequireAuthorization"/> is off).
/// </summary>
internal static class GroupScopeAuthorization
{
    // Keyed by the group instance itself: every DeclareGroupScope call for the same group accumulates into
    // the same method->scope map, and the group.Finally callback registered on the FIRST call reads it —
    // Finally runs once per endpoint, after every other convention (including a route's own RequireScope or
    // AllowAnonymous), so it always sees the final per-route metadata state before deciding (R1).
    private static readonly ConditionalWeakTable<RouteGroupBuilder, Dictionary<string, string>> Declarations = new();

    /// <summary>
    /// Declares that every route this group registers for one of <paramref name="httpMethods"/> requires
    /// <paramref name="scope"/>, unless that route names its own scope or is anonymous (R1). Chainable, and
    /// callable more than once per group — one call per method, or one call shared across several.
    /// </summary>
    /// <param name="group">The group returned by <c>EndpointConfigExtensions.UseEndpointConfigs</c>.</param>
    /// <param name="scope">The scope every covered method requires.</param>
    /// <param name="httpMethods">The HTTP methods this declaration covers (e.g. <c>"GET"</c>, <c>"PUT"</c>).</param>
    public static RouteGroupBuilder DeclareGroupScope(this RouteGroupBuilder group, string scope, params string[] httpMethods)
    {
        // Mirrors ConditionalScopeAuthorization's own reasoning (R3), but keys off whether authorization is
        // actually wired into this host rather than FeatureOptions.RequireAuthorization directly:
        // EndpointConfigExtensions.UseEndpointConfigs only registers authorization services/policies (and the
        // shipped host's AuthConfig.AddAuthConfig only runs) when the feature is on, so IAuthorizationPolicyProvider
        // is present if and only if a request through this host can actually be authorized. Reading the flag
        // itself would misfire in a host that wires authorization by hand without ever binding FeatureOptions
        // (as GroupScopeCoverageTests' test-only hosts do) — IOptions<FeatureOptions> resolves to a silent
        // all-defaults instance there instead of throwing, defaulting RequireAuthorization to false.
        var active = ((IEndpointRouteBuilder)group).ServiceProvider.GetService<IAuthorizationPolicyProvider>() is not null;
        if (!active)
        {
            // R3: the whole mechanism is inert with authorization off — no declaration recorded, no Finally
            // convention registered, so EnsureGroupScopeCoverage never sees this group as declaring anything.
            return group;
        }

        if (!Declarations.TryGetValue(group, out var methodScopes))
        {
            methodScopes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            Declarations.Add(group, methodScopes);
            ((IEndpointConventionBuilder)group).Finally(endpoint => ApplyGroupScope(endpoint, methodScopes));
        }

        foreach (var method in httpMethods)
        {
            methodScopes[method] = scope;
        }

        return group;
    }

    private static void ApplyGroupScope(EndpointBuilder endpoint, IReadOnlyDictionary<string, string> methodScopes)
    {
        // A per-route scope always carries a policy name (the scope itself, via ConditionalScopeAuthorization's
        // .RequireAuthorization(scope)) — unlike the blanket, no-policy Authorize metadata that
        // EndpointConfigExtensions.UseEndpointConfigs' own RequireAuthorization option already stamps on every
        // route in every group regardless of this mechanism. Only a NAMED policy, or AllowAnonymous, wins over
        // the group declaration (R1); the blanket entry must not be mistaken for one.
        if (endpoint.Metadata.OfType<IAuthorizeData>().Any(a => !string.IsNullOrEmpty(a.Policy)) ||
            endpoint.Metadata.OfType<IAllowAnonymous>().Any())
        {
            return;
        }

        // Every endpoint a RouteGroupBuilder's Map* methods produce is a RouteEndpointBuilder; a route mapped
        // through .Map (no verb restriction) carries no IHttpMethodMetadata at all, since it serves every verb.
        var routePattern = ((RouteEndpointBuilder)endpoint).RoutePattern.RawText!;
        var methods = endpoint.Metadata.OfType<IHttpMethodMetadata>().SelectMany(m => m.HttpMethods).ToArray();
        if (methods.Length == 0)
        {
            // A verb-less route serves every HTTP method, so no per-method declaration can ever cover it (R5's
            // "*" case) — refuse rather than silently letting it slip through as GET-shaped coverage.
            endpoint.Metadata.Add(new UncoveredGroupScopeRoute(routePattern, "*"));
            return;
        }

        // Refuse on ANY served method the group never declared — a route serving several methods (e.g.
        // MapMethods(["GET", "POST"])) is only covered when every one of them is, not merely the first match.
        var uncoveredMethod = methods.FirstOrDefault(method => !methodScopes.ContainsKey(method));
        if (uncoveredMethod is not null)
        {
            // Tag it so EnsureGroupScopeCoverage can find it later without re-deriving the same lookup against
            // a raw Endpoint (which no longer knows which RouteGroupBuilder it came from).
            endpoint.Metadata.Add(new UncoveredGroupScopeRoute(routePattern, uncoveredMethod));
            return;
        }

        foreach (var scope in methods.Select(method => methodScopes[method]).Distinct(StringComparer.Ordinal))
        {
            endpoint.Metadata.Add(new AuthorizeAttribute(scope));
        }
    }

    /// <summary>
    /// Walks <paramref name="endpoints"/> and, for every group that declared at least one
    /// <see cref="DeclareGroupScope"/> method, throws when one of its routes serves an HTTP method with no
    /// group declaration, no per-route scope and no <c>AllowAnonymous</c> (DRK-1498 §3 row 3). A group that
    /// declared nothing is untouched (R2). Takes a raw endpoint sequence — not a host — so a test can build a
    /// violating group and call this directly, without registering it into <c>Program.cs</c>.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// A declaring group serves a method with no coverage. The message names the route pattern and the method,
    /// `*` for a verb-less route that serves every method (R5).
    /// </exception>
    public static void EnsureGroupScopeCoverage(IEnumerable<Endpoint> endpoints)
    {
        foreach (var endpoint in endpoints)
        {
            var uncovered = endpoint.Metadata.GetMetadata<UncoveredGroupScopeRoute>();
            if (uncovered is not null)
            {
                throw new InvalidOperationException(
                    $"Route '{uncovered.RoutePattern}' serves HTTP {uncovered.Method} with no declared group " +
                    "scope, per-route scope, or AllowAnonymous.");
            }
        }
    }

    private sealed record UncoveredGroupScopeRoute(string RoutePattern, string Method);
}

/// <summary>
/// Runs <see cref="GroupScopeAuthorization.EnsureGroupScopeCoverage"/> once, during host startup, against the
/// app's own live <see cref="EndpointDataSource"/> (DRK-1498 §3 rows 3-4) — registered via
/// <see cref="GroupScopeCoverageStartupCheckExtensions.AddGroupScopeCoverageCheck"/> so a declaring group left
/// with an uncovered method aborts startup instead of shipping silently. Runs from <c>StartedAsync</c>, not
/// plain <c>StartAsync</c>: minimal-hosting endpoint mapping (<c>Program.cs</c>'s top-level <c>UseEndpointConfigs</c>
/// call) happens before the host starts, but a classic <c>IHostBuilder</c>/<c>Configure</c> host (as
/// <c>GroupScopeCoverageTests.BuildTestHostAsync</c> uses) only maps its routes when the framework's own
/// <c>GenericWebHostService</c> — itself an ordinary hosted service — runs its <c>StartAsync</c>. Hosted
/// services registered ahead of it in the container (which this one is, since <c>ConfigureServices</c> callbacks
/// queued from user code apply before the framework appends its own) would see zero endpoints from plain
/// <c>StartAsync</c>. <see cref="IHostedLifecycleService.StartedAsync"/> runs one phase later, strictly after
/// EVERY hosted service's own <c>StartAsync</c> (routing included) has completed, while still executing inside
/// the same <c>IHost.StartAsync</c> call — so its exception still fails host startup exactly like a plain
/// <c>IHostedService.StartAsync</c> exception would, just correctly ordered against route mapping.
/// </summary>
internal sealed class GroupScopeCoverageHostedService(EndpointDataSource endpointDataSource) : IHostedLifecycleService
{
    public Task StartingAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StartAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StartedAsync(CancellationToken cancellationToken)
    {
        GroupScopeAuthorization.EnsureGroupScopeCoverage(endpointDataSource.Endpoints);
        return Task.CompletedTask;
    }

    public Task StoppingAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StoppedAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

/// <summary>Registers <see cref="GroupScopeCoverageHostedService"/>. Call once, alongside <c>UseEndpointConfigs</c>
/// (DRK-1498 §3 row 4).</summary>
internal static class GroupScopeCoverageStartupCheckExtensions
{
    public static IServiceCollection AddGroupScopeCoverageCheck(this IServiceCollection services) =>
        services.AddHostedService<GroupScopeCoverageHostedService>();
}

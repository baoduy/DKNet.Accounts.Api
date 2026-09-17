namespace DKNet.Accounts.Api.Configs.Auth;

/// <summary>
/// Declares, once per HTTP method, the scope every route in an endpoint group requires — unless the route
/// declares its own scope (<see cref="ConditionalScopeAuthorization.RequireScope{TBuilder}"/>) or is
/// anonymous. Several declarations may be added to one group: one per method, or one shared across several
/// (DRK-1498 §3 rows 1-2). Mirrors <see cref="ConditionalScopeAuthorization"/> — a no-op, declarations and
/// coverage check alike, when the host has <see cref="FeatureOptions.RequireAuthorization"/> off (R3).
/// </summary>
internal static class GroupScopeAuthorization
{
    /// <summary>
    /// Declares that every route this group registers for one of <paramref name="httpMethods"/> requires
    /// <paramref name="scope"/>, unless that route names its own scope or is anonymous (R1). Chainable, and
    /// callable more than once per group — one call per method, or one call shared across several.
    /// </summary>
    /// <param name="group">The group returned by <c>EndpointConfigExtensions.UseEndpointConfigs</c>.</param>
    /// <param name="scope">The scope every covered method requires.</param>
    /// <param name="httpMethods">The HTTP methods this declaration covers (e.g. <c>"GET"</c>, <c>"PUT"</c>).</param>
    public static RouteGroupBuilder DeclareGroupScope(this RouteGroupBuilder group, string scope, params string[] httpMethods) =>
        throw new NotImplementedException();

    /// <summary>
    /// Walks <paramref name="endpoints"/> and, for every group that declared at least one
    /// <see cref="DeclareGroupScope"/> method, throws when one of its routes serves an HTTP method with no
    /// group declaration, no per-route scope and no <c>AllowAnonymous</c> (DRK-1498 §3 row 3). A group that
    /// declared nothing is untouched (R2). Takes a raw endpoint sequence — not a host — so a test can build a
    /// violating group and call this directly, without registering it into <c>Program.cs</c>.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// A declaring group serves a method with no coverage. The message names the group and the method (R5).
    /// </exception>
    public static void EnsureGroupScopeCoverage(IEnumerable<Endpoint> endpoints) =>
        throw new NotImplementedException();
}

/// <summary>
/// Runs <see cref="GroupScopeAuthorization.EnsureGroupScopeCoverage"/> once, during host startup, against the
/// app's own live <see cref="EndpointDataSource"/> (DRK-1498 §3 rows 3-4) — registered via
/// <see cref="GroupScopeCoverageStartupCheckExtensions.AddGroupScopeCoverageCheck"/> so a declaring group left
/// with an uncovered method aborts startup instead of shipping silently. An <see cref="IHostedService"/>'s
/// <c>StartAsync</c> exception propagates through <c>IHost.StartAsync</c> and fails the host build — the same
/// entry point a real run and a test alike start through, so "the check throws" and "startup fails" are the
/// same event, not two separate assertions.
/// </summary>
internal sealed class GroupScopeCoverageHostedService(EndpointDataSource endpointDataSource) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        GroupScopeAuthorization.EnsureGroupScopeCoverage(endpointDataSource.Endpoints);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

/// <summary>Registers <see cref="GroupScopeCoverageHostedService"/>. Call once, alongside <c>UseEndpointConfigs</c>
/// (DRK-1498 §3 row 4).</summary>
internal static class GroupScopeCoverageStartupCheckExtensions
{
    public static IServiceCollection AddGroupScopeCoverageCheck(this IServiceCollection services) =>
        services.AddHostedService<GroupScopeCoverageHostedService>();
}

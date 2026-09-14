namespace DKNet.Accounts.Api.Configs.Auth;

/// <summary>
/// Applies a scope requirement to one route the same way <c>DKNet.AspCore.Extensions</c>' own group-level
/// <c>EndpointRegistrationOptions.RequireAuthorization</c> flag already behaves — respected when the host has
/// the feature on, a no-op when it doesn't.
/// </summary>
/// <remarks>
/// Every route in this API declares its OWN scope (§5) rather than one blanket group policy, so it cannot use
/// that framework mechanism directly (it operates at the whole-group level, one policy for every route in a
/// config). Calling <c>.RequireAuthorization(scope)</c> unconditionally, as a hand-written per-route call,
/// left the metadata in place even when the host never wires <c>UseAuthentication</c>/<c>UseAuthorization</c>
/// (host has <c>RequireAuthorization</c> off) — ASP.NET Core then throws
/// "contains authorization metadata, but a middleware was not found that supports authorization" on every
/// request to that route, real Kestrel or TestServer alike (found while diagnosing DRK-1242 §3 row 13's
/// "500 instead of 413" — the true cause was this mismatch, not the request-bounds feature itself; every
/// fixture that turns auth off is affected, not only the body-size scenarios).
/// </remarks>
internal static class ConditionalScopeAuthorization
{
    public static TBuilder RequireScope<TBuilder>(this TBuilder builder, RouteGroupBuilder group, string scope)
        where TBuilder : IEndpointConventionBuilder
    {
        var requireAuthorization = ((IEndpointRouteBuilder)group).ServiceProvider
            .GetRequiredService<IOptions<FeatureOptions>>().Value.RequireAuthorization;

        return requireAuthorization ? builder.RequireAuthorization(scope) : builder;
    }
}

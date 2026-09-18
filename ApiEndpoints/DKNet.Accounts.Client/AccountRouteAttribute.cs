namespace DKNet.Accounts.Client;

/// <summary>Records the HTTP method and raw route pattern an <see cref="IAccountClient"/> method calls —
/// the raw pattern is copied verbatim from the live service's own route (the same string
/// <c>RouteEndpoint.RoutePattern.RawText</c> reports, e.g. <c>/v{version:apiVersion}/accounts/{id:guid}/balance</c>).
/// The parity test (spec §5 "every route has one method and every method has one route") walks
/// <see cref="IAccountClient"/> by reflection using this attribute instead of hand-keeping a second route
/// list that could drift from the first.</summary>
[AttributeUsage(AttributeTargets.Method)]
public sealed class AccountRouteAttribute(string method, string rawPattern) : Attribute
{
    public string Method { get; } = method;

    public string RawPattern { get; } = rawPattern;
}

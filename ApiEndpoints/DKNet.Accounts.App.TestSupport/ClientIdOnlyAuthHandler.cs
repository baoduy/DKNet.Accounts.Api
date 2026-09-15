using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DKNet.Accounts.App.TestSupport;

/// <summary>
/// Fake authentication scheme shaped like the real machine-to-machine credential (a client-credentials
/// grant): only a <c>client_id</c> claim and a space-separated <c>scope</c> claim, deliberately no subject
/// claim at all (no <c>oid</c>/<c>ClaimTypes.NameIdentifier</c>/<c>sub</c>, unlike <see cref="LedgerCallerAuthHandler"/>,
/// which adds one so DRK-1279's acceptance scenarios resolve ownership through the subject-claim path).
/// Exists to drive <c>PrincipalProvider.Initialize</c>'s <c>client_id</c> fallback end to end (DRK-1277 §12) —
/// proving <c>DataOwnerHook</c> actually stamps from that key and the save completes, not just that
/// <c>GetOwnershipKey()</c> returns it in isolation.
/// </summary>
public sealed class ClientIdOnlyAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "ClientIdOnlyTestScheme";

    /// <summary>The calling system identity — maps to a <c>client_id</c> claim.</summary>
    public const string ClientIdHeaderName = "X-Test-Client-Id";

    /// <summary>Space-separated scopes — maps to one <c>scope</c> claim.</summary>
    public const string ScopesHeaderName = "X-Test-Scopes";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(ClientIdHeaderName, out var clientId) || string.IsNullOrEmpty(clientId))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new List<Claim> { new("client_id", clientId!) };

        if (Request.Headers.TryGetValue(ScopesHeaderName, out var scopes) && !string.IsNullOrEmpty(scopes))
        {
            claims.Add(new Claim("scope", scopes!));
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

    /// <summary>
    /// Registers this scheme as the default authenticate/challenge scheme, overriding whatever the host's own
    /// <c>AddAuthConfig</c> configured. Call from a test factory's <c>ConfigureTestServices</c> override.
    /// </summary>
    public static void Register(IServiceCollection services) =>
        services.AddAuthentication(SchemeName)
            .AddScheme<AuthenticationSchemeOptions, ClientIdOnlyAuthHandler>(SchemeName, _ => { });
}

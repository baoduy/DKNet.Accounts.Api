using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DKNet.Accounts.App.TestSupport;

/// <summary>
/// Fake authentication scheme for the accounts and ledger service's callers — both a machine-to-machine
/// credential and a person signed in through Microsoft Entra ID (DRK-1670). The calling application is carried
/// as one of three claims mirroring the real credential shapes: <c>client_id</c> (machine-to-machine),
/// <c>azp</c> (a person's v2.0 Entra token) or <c>appid</c> (a person's v1.0 Entra token); scopes as a
/// space-separated <c>scope</c> claim — the same claim shape the API's own <c>HasScopeHandler</c> already knows
/// how to read. A request carrying none of <see cref="ClientIdHeaderName"/>/<see cref="AzpHeaderName"/>/
/// <see cref="AppIdHeaderName"/>/<see cref="SubjectHeaderName"/> is left unauthenticated —
/// <see cref="AuthenticateResult.NoResult"/> — so the default-deny fallback policy refuses it, exercising the
/// "no credential" scenarios without a real token. A request naming a person but no calling application at all
/// (§3 row 5, "A token naming no calling application is still refused") still authenticates, so it reaches the
/// service's own calling-system guard instead of being refused at the authentication layer.
/// </summary>
/// <remarks>
/// Also carries a <see cref="ClaimTypes.NameIdentifier"/> subject claim when <see cref="SubjectHeaderName"/> is
/// set (DRK-1372 §5): <c>DataOwnerHook</c> stamps <c>CreatedBy</c>/<c>UpdatedBy</c> from
/// <c>IDataOwnerProvider.GetOwnershipKey()</c> — which <c>PrincipalProvider.Initialize</c> resolves from a
/// subject claim (<c>oid</c>/<c>ClaimTypes.NameIdentifier</c>/<c>sub</c>) first, falling back to <c>client_id</c>
/// only when no subject claim is present. Without <see cref="SubjectHeaderName"/>, no subject claim is emitted
/// at all, so a scenario can drive that real fallback instead of always resolving to the calling system.
/// </remarks>
public sealed class LedgerCallerAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "LedgerCallerTestScheme";

    /// <summary>The calling system identity for a machine-to-machine credential — maps to a <c>client_id</c>
    /// claim.</summary>
    public const string ClientIdHeaderName = "X-Test-Client-Id";

    /// <summary>The calling application named on a person's v2.0 Entra token — maps to an <c>azp</c>
    /// claim.</summary>
    public const string AzpHeaderName = "X-Test-Azp";

    /// <summary>The calling application named on a person's v1.0 Entra token — maps to an <c>appid</c>
    /// claim.</summary>
    public const string AppIdHeaderName = "X-Test-AppId";

    /// <summary>Space-separated scopes — maps to one <c>scope</c> claim.</summary>
    public const string ScopesHeaderName = "X-Test-Scopes";

    /// <summary>The person named in the credential, alongside the calling system. Maps to both
    /// <see cref="ClaimTypes.Name"/> and <see cref="ClaimTypes.NameIdentifier"/>. Omitted entirely when this
    /// header is absent, so the credential names only a calling system — no person at all.</summary>
    public const string SubjectHeaderName = "X-Test-Subject";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var hasClientId = Request.Headers.TryGetValue(ClientIdHeaderName, out var clientId) && !string.IsNullOrEmpty(clientId);
        var hasAzp = Request.Headers.TryGetValue(AzpHeaderName, out var azp) && !string.IsNullOrEmpty(azp);
        var hasAppId = Request.Headers.TryGetValue(AppIdHeaderName, out var appId) && !string.IsNullOrEmpty(appId);
        var hasSubject = Request.Headers.TryGetValue(SubjectHeaderName, out var subject) && !string.IsNullOrEmpty(subject);

        if (!hasClientId && !hasAzp && !hasAppId && !hasSubject)
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new List<Claim>();
        if (hasClientId)
        {
            claims.Add(new Claim("client_id", clientId!));
        }

        if (hasAzp)
        {
            claims.Add(new Claim("azp", azp!));
        }

        if (hasAppId)
        {
            claims.Add(new Claim("appid", appId!));
        }

        if (hasSubject)
        {
            claims.Add(new Claim(ClaimTypes.Name, subject!));
            claims.Add(new Claim(ClaimTypes.NameIdentifier, subject!));
        }
        else if (hasClientId)
        {
            claims.Add(new Claim(ClaimTypes.Name, clientId!));
        }

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
            .AddScheme<AuthenticationSchemeOptions, LedgerCallerAuthHandler>(SchemeName, _ => { });
}

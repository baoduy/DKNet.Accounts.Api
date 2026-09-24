using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// <see cref="ApiFixture" /> variant with <c>RequireAuthorization</c> on and the real JWT bearer scheme kept
/// (no fake auth handler) — so a request carries a genuinely signed token through <c>JwtBearerHandler</c> and
/// whatever claim mapping the service's own bearer setup applies (DRK-1736). In test services only, the bearer
/// options are post-configured to trust a local signing key, issuer and audience instead of fetching issuer
/// metadata; <c>MapInboundClaims</c> and <c>NameClaimType</c> are left exactly as the service sets them.
/// Same early-bind env-var constraint as <see cref="AuthOnApiFixture" />.
/// </summary>
/// <remarks>
/// <see cref="PrincipalProbeStartupFilter" /> copies what the real <see cref="IPrincipalProvider" /> and
/// <c>User.Identity.Name</c> resolved for the request onto test-only response headers — the service publishes
/// no route that returns them, and this adds none.
/// </remarks>
public sealed class SignedTokenApiFixture : TestApiFactoryBase, IAsyncLifetime
{
    public const string Issuer = "https://issuer.drk-1736.test/";
    public const string Audience = "api://drk-1736-tests";

    private const string RequireAuthorizationEnvKey = "FeatureManagement__RequireAuthorization";

    private readonly SymmetricSecurityKey _signingKey = new(RandomNumberGenerator.GetBytes(32));

    public SignedTokenApiFixture() => Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, "true");

    #region Methods

    /// <summary>Mints a token carrying exactly <paramref name="claims" />, signed with this fixture's key unless
    /// <paramref name="signingKey" /> names another.</summary>
    public string MintToken(IDictionary<string, object> claims, SecurityKey? signingKey = null) =>
        new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = Issuer,
            Audience = Audience,
            Claims = claims,
            Expires = DateTime.UtcNow.AddMinutes(5),
            SigningCredentials = new SigningCredentials(signingKey ?? _signingKey, SecurityAlgorithms.HmacSha256)
        });

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);

        // Mutates the bound options rather than replacing TokenValidationParameters, so the service's own
        // settings on it (NameClaimType among them) survive.
        services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
        {
            options.MetadataAddress = null!;
            options.Authority = null;
            options.ConfigurationManager = null;
            options.Configuration = null;
            options.TokenValidationParameters.ValidIssuer = Issuer;
            options.TokenValidationParameters.ValidAudience = Audience;
            options.TokenValidationParameters.IssuerSigningKey = _signingKey;
        });

        services.AddSingleton<IStartupFilter, PrincipalProbeStartupFilter>();
    }

    public async Task InitializeAsync()
    {
        _ = CreateClient();
        await ResetDatabaseAsync();
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;

    protected override void Dispose(bool disposing)
    {
        Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, null);
        base.Dispose(disposing);
    }

    #endregion
}

/// <summary>
/// Outermost middleware (see <see cref="RemoteIpTestStartupFilter" />) that, when the response starts — after
/// authentication has populated <c>HttpContext.User</c> — stamps the request's resolved principal values onto
/// response headers. A value that resolved to nothing is left off, so an absent header reads as "not found".
/// </summary>
public sealed class PrincipalProbeStartupFilter : IStartupFilter
{
    public const string IdentityNameHeader = "X-Test-Identity-Name";
    public const string UserNameHeader = "X-Test-Principal-UserName";
    public const string EmailHeader = "X-Test-Principal-Email";
    public const string OwnershipKeyHeader = "X-Test-Principal-OwnershipKey";

    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
    {
        app.Use(async (context, nextMiddleware) =>
        {
            context.Response.OnStarting(() =>
            {
                var principal = context.RequestServices.GetRequiredService<IPrincipalProvider>();
                Stamp(IdentityNameHeader, context.User.Identity?.Name);
                Stamp(UserNameHeader, principal.UserName);
                Stamp(EmailHeader, principal.Email);
                Stamp(OwnershipKeyHeader, principal.GetCurrentUser());
                return Task.CompletedTask;

                void Stamp(string header, string? value)
                {
                    if (!string.IsNullOrEmpty(value))
                    {
                        context.Response.Headers[header] = value;
                    }
                }
            });

            await nextMiddleware();
        });

        next(app);
    };
}

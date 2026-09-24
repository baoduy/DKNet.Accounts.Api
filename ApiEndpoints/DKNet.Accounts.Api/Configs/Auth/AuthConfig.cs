using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;

namespace DKNet.Accounts.Api.Configs.Auth;

/// <summary>
///     Provides extension methods for configuring authentication and authorization in an ASP.NET Core application.
/// </summary>
[ExcludeFromCodeCoverage]
internal static class AuthConfig
{
    #region Methods

    /// <summary>
    ///     Adds authentication and authorization services to the specified <see cref="IServiceCollection" />.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection" /> to add the authentication and authorization services to.</param>
    /// <returns>The updated <see cref="IServiceCollection" /> instance.</returns>
    /// <remarks>
    ///     This method configures the application to use JWT (JSON Web Token) Bearer authentication.
    ///     The token signature is validated against the issuer metadata from the
    ///     <c>Authentication:Schemes:Bearer:MetadataAddress</c> configuration.
    ///     Inbound claim mapping is off so claims keep the names they were issued with — <c>scp</c> must reach
    ///     <see cref="HasScopeHandler" /> as <c>scp</c>, and <c>User.Identity.Name</c> reads the token's <c>name</c> claim.
    /// </remarks>
    public static IServiceCollection AddAuthConfig(this IServiceCollection services)
    {
        services.MarkConfigAdded(nameof(AuthConfig));

        services.AddAuthentication()
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters.NameClaimType = "name";
            });

        services.AddAuthorization(options =>
        {
            // Default deny: any endpoint not explicitly declared anonymous requires an authenticated caller.
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();

            // One policy per operation class (§5 of the ledger contract) — the policy name is the
            // scope string itself, so an endpoint just calls .RequireAuthorization(ScopeNames.AccountsRead).
            foreach (var scope in ScopeNames.All)
                options.AddPolicy(scope, policy => policy.Requirements.Add(new HasScopeRequirement(scope)));
        });

        // Sample IClaimsTransformation: enriches the user principal after authentication.
        // TODO: Replace SampleClaimsTransformation with your real implementation or remove if not needed.
        services.AddScoped<IClaimsTransformation, SampleClaimsTransformation>();

        // Sample IAuthorizationHandler: evaluates HasScopeRequirement.
        // TODO: Replace HasScopeHandler with your real handler(s) or remove if not needed.
        services.AddScoped<IAuthorizationHandler, HasScopeHandler>();

        return services;
    }

    /// <summary>
    ///     Configures the specified <see cref="WebApplication" /> to use the added authentication and authorization services.
    /// </summary>
    /// <param name="app">The <see cref="WebApplication" /> to configure.</param>
    /// <returns>The updated <see cref="WebApplication" /> instance.</returns>
    /// <remarks>
    ///     This method enables authentication and authorization middleware only if the authentication configuration has been
    ///     added to the services.
    /// </remarks>
    public static WebApplication UseAuthConfig(this WebApplication app)
    {
        if (app.Services.IsConfigAdded(nameof(AuthConfig)))
        {
            app.UseAuthentication();
            app.UseAuthorization();
            Console.WriteLine("Authentication enabled.");
        }

        return app;
    }

    #endregion
}
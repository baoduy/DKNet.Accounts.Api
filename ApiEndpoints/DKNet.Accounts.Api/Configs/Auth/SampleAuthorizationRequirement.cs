using Microsoft.AspNetCore.Authorization;

namespace DKNet.Accounts.Api.Configs.Auth;

/// <summary>
///     The scope names §5 of the ledger contract requires — one per operation class. Each is also the
///     authorization policy name registered in <see cref="AuthConfig" />, so an endpoint protects itself
///     with <c>.RequireAuthorization(ScopeNames.AccountsRead)</c>.
/// </summary>
[ExcludeFromCodeCoverage]
internal static class ScopeNames
{
    public const string AccountsRead = "accounts.read";
    public const string AccountsWrite = "accounts.write";
    public const string PostingsRead = "postings.read";
    public const string PostingsWrite = "postings.write";
    public const string PostingsReverse = "postings.reverse";

    public static readonly IReadOnlyCollection<string> All =
        [AccountsRead, AccountsWrite, PostingsRead, PostingsWrite, PostingsReverse];
}

/// <summary>
///     An <see cref="IAuthorizationRequirement" /> satisfied when the caller's JWT carries the given scope.
///     Paired with <see cref="HasScopeHandler" /> and registered per scope in <see cref="AuthConfig" />.
/// </summary>
/// <param name="requiredScope">The JWT scope value the caller must possess to satisfy this requirement.</param>
[ExcludeFromCodeCoverage]
internal sealed class HasScopeRequirement(string requiredScope) : IAuthorizationRequirement
{
    #region Properties

    /// <summary>Gets the JWT scope value that the user must possess to satisfy this requirement.</summary>
    public string RequiredScope { get; } = requiredScope;

    #endregion
}

/// <summary>
///     Authorization handler that evaluates <see cref="HasScopeRequirement" />.
/// </summary>
/// <remarks>
///     <para>
///         Extend this class to inject additional services (e.g. a repository) via the constructor
///         when the authorization decision requires data beyond the current user's claims.
///     </para>
///     <para>
///         Register with DI as
///         <c>services.AddScoped&lt;IAuthorizationHandler, HasScopeHandler&gt;()</c>.
///     </para>
/// </remarks>
[ExcludeFromCodeCoverage]
internal sealed class HasScopeHandler : AuthorizationHandler<HasScopeRequirement>
{
    #region Methods

    /// <inheritdoc />
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        HasScopeRequirement requirement)
    {
        // JWT tokens issued by Azure AD / Entra ID use "scp" for delegated scopes.
        // Other providers may use "scope" – check both for portability.
        var scopeClaim = context.User.FindFirst(c =>
            c.Type.Equals("scp", StringComparison.OrdinalIgnoreCase) ||
            c.Type.Equals("scope", StringComparison.OrdinalIgnoreCase));

        if (scopeClaim is null)
        {
            // No scope claim present – leave the requirement unsatisfied.
            return Task.CompletedTask;
        }

        // A single scope claim may contain multiple space-separated values.
        var scopes = scopeClaim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        if (scopes.Any(s => s.Equals(requirement.RequiredScope, StringComparison.OrdinalIgnoreCase)))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }

    #endregion
}

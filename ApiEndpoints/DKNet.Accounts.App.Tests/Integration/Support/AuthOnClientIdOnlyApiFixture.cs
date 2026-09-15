using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// <see cref="ApiFixture" /> variant with <c>FeatureManagement:RequireAuthorization</c> flipped on, like
/// <see cref="LedgerApiFixture" />, but authenticates every request via <see cref="ClientIdOnlyAuthHandler" />
/// instead — a caller shaped like a real machine-to-machine credential, with no subject claim at all. Proves
/// <c>PrincipalProvider.Initialize</c>'s <c>client_id</c> fallback end to end (DRK-1277 §12).
/// </summary>
/// <remarks>
/// See <see cref="AuthOnApiFixture" />'s remarks for why the early-bind env var is required here too.
/// </remarks>
public sealed class AuthOnClientIdOnlyApiFixture : TestApiFactoryBase, IAsyncLifetime
{
    private const string RequireAuthorizationEnvKey = "FeatureManagement__RequireAuthorization";

    public AuthOnClientIdOnlyApiFixture() => Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, "true");

    #region Methods

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        ClientIdOnlyAuthHandler.Register(services);
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

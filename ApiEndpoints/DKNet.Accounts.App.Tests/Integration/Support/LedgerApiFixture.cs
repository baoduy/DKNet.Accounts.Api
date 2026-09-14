using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// <see cref="ApiFixture" /> variant wired the same way <c>BddApiFactory</c> is — <c>RequireAuthorization</c>
/// forced on and <see cref="LedgerCallerAuthHandler" /> standing in for the real JWT bearer scheme, so a
/// request can carry <c>client_id</c>/scopes via its <c>X-Test-Client-Id</c>/<c>X-Test-Scopes</c> headers. Used
/// for xUnit-level coverage of AccountGroup/Account handler branches the BDD acceptance scenarios don't reach
/// (e.g. reparent success, group-by-id, duplicate group code) without duplicating the whole Reqnroll harness.
/// </summary>
public sealed class LedgerApiFixture : TestApiFactoryBase, IAsyncLifetime
{
    private const string RequireAuthorizationEnvKey = "FeatureManagement__RequireAuthorization";

    public LedgerApiFixture() => Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, "true");

    #region Methods

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        LedgerCallerAuthHandler.Register(services);
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

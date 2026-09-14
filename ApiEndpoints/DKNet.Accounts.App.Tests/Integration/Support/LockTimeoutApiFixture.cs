using Microsoft.Extensions.DependencyInjection.Extensions;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Domains.Services;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// <see cref="ApiFixture" /> variant whose <see cref="IAccountLockProvider" /> always times out, so a request
/// reliably reaches Record/RecordBatch/Reverse's "could not acquire the account lock" refusal — the one
/// branch no acceptance scenario can reach without a real, sustained lock contention.
/// </summary>
public sealed class LockTimeoutApiFixture : TestApiFactoryBase, IAsyncLifetime
{
    private const string RequireAuthorizationEnvKey = "FeatureManagement__RequireAuthorization";

    public LockTimeoutApiFixture() => Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, "true");

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        LedgerCallerAuthHandler.Register(services);
        services.RemoveAll<IAccountLockProvider>();
        services.AddSingleton<IAccountLockProvider, AlwaysTimesOutLockProvider>();
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
}

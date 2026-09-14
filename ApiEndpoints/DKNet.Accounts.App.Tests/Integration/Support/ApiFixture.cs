using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.Support;

public sealed class ApiFixture : TestApiFactoryBase, IAsyncLifetime
{
    #region Methods

    public async Task InitializeAsync()
    {
        _ = CreateClient();
        await ResetDatabaseAsync();
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;

    #endregion
}

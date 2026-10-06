using DKNet.Accounts.Infra.Extensions;
using Npgsql;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// A second host on a database of its own inside the run-shared Postgres container, for the scenarios the
/// shared host cannot serve (DRK-1719 §5): the shared database is truncated and re-seeded by hand before every
/// scenario (<see cref="BddApiFactory.ResetDatabaseAsync"/>), so it cannot prove what a fresh deployment seeds.
/// This host's database is built by the API's real startup path only — never truncated, never seeded by
/// <see cref="TestApiFactoryBase"/> — and is left behind for the container to discard at the end of the run.
/// </summary>
public sealed class ScratchDatabaseApiFactory : TestApiFactoryBase
{
    private const string RequireAuthorizationEnvKey = "FeatureManagement__RequireAuthorization";

    private readonly string _connectionString;

    public ScratchDatabaseApiFactory(string serverConnectionString)
    {
        _connectionString = new NpgsqlConnectionStringBuilder(serverConnectionString)
        {
            Database = $"scratch_{Guid.NewGuid():N}"
        }.ConnectionString;

        // Same reason as ApiHooks.BeforeTestRun: Program.cs binds FeatureOptions before the settings
        // dictionary is merged, so the environment variable is the one input read early enough. The host is
        // built by the first Services/CreateClient access, which happens inside this window.
        Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, "true");
        try
        {
            Client = CreateClient();
        }
        finally
        {
            Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, null);
        }
    }

    public HttpClient Client { get; }

    protected override string DbConnectionString => _connectionString;

    protected override void ConfigureDatabase(DbContextOptionsBuilder options) => options.UseNpgsql(_connectionString);

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        LedgerCallerAuthHandler.Register(services);
    }

    /// <summary>Creates the database, applies every migration and seeds it, the way a fresh deployment does
    /// (<see cref="InfraMigration.MigrateDb"/>) — the DI context has no <c>UseAutoDataSeeding</c>.</summary>
    public Task MigrateToLatestAsync() => InfraMigration.MigrateDb(_connectionString);
}

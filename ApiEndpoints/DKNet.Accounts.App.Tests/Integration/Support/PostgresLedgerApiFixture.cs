using Microsoft.EntityFrameworkCore;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Infra.Extensions;
using Testcontainers.PostgreSql;
using DKNet.Accounts.Infra.Postgres;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// <see cref="LedgerApiFixture"/> variant that runs the full HTTP pipeline (auth, validation, locking,
/// idempotency) against a REAL PostgreSQL container instead of the EF Core InMemory provider — the write-path
/// counterpart of <see cref="Ledger.AccountReadPathsPostgresTests"/> and
/// <see cref="DKNet.Accounts.App.BDDTests.Support.BddApiFactory"/>'s own Postgres wiring, built on the same
/// <see cref="TestApiFactoryBase.ConfigureDatabase"/>/<see cref="TestApiFactoryBase.DbConnectionString"/>
/// extension points those add. Real Postgres enforces the <c>varchar(64)</c>/text column constraints the
/// InMemory provider never does (DRK-1247 B1/B2/B3).
/// </summary>
public sealed class PostgresLedgerApiFixture : TestApiFactoryBase, IAsyncLifetime
{
    private const string RequireAuthorizationEnvKey = "FeatureManagement__RequireAuthorization";

    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine").Build();

    public PostgresLedgerApiFixture() => Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, "true");

    #region Methods

    protected override string DbConnectionString => _container.GetConnectionString();

    protected override void ConfigureDatabase(DbContextOptionsBuilder options) =>
        options.UseNpgsql(_container.GetConnectionString());

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        LedgerCallerAuthHandler.Register(services);
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        _ = CreateClient();

        // The API's real startup path: the factory's DI context has no UseAutoDataSeeding, so migrating it
        // directly would leave the seeded currencies out and every account open would 422.
        await InfraMigration.MigrateDb(_container.GetConnectionString(), (builder, conn) => builder.UsePostgres(conn));
    }

    async Task IAsyncLifetime.DisposeAsync() => await _container.DisposeAsync();

    protected override void Dispose(bool disposing)
    {
        Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, null);
        base.Dispose(disposing);
    }

    #endregion
}

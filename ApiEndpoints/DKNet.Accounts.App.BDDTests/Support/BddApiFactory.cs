using DKNet.AspCore.Idempotency;
using DKNet.AspCore.Idempotency.RedisStore;
using DKNet.AspCore.Idempotency.Store;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Testcontainers.PostgreSql;

namespace DKNet.Accounts.App.BDDTests.Support;

public sealed class BddApiFactory(string? redisConnectionString = null) : TestApiFactoryBase("bdd-tests")
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine").Build();

    /// <summary>Starts the PostgreSQL container. Must complete before <c>CreateClient</c> is called.</summary>
    public Task StartDatabaseAsync() => _container.StartAsync();

    /// <summary>Stops the PostgreSQL container. Call after the shared factory itself is disposed.</summary>
    public Task StopDatabaseAsync() => _container.DisposeAsync().AsTask();

    protected override string DbConnectionString => _container.GetConnectionString();

    /// <summary>The run-shared container's connection string, for a scenario that needs a database of its own
    /// on the same server (<see cref="ScratchDatabaseApiFactory"/>).</summary>
    public string ContainerConnectionString => _container.GetConnectionString();

    protected override void ConfigureDatabase(DbContextOptionsBuilder options) =>
        options.UseNpgsql(_container.GetConnectionString());

    /// <summary>
    /// Base <see cref="TestApiFactoryBase.ResetDatabaseAsync"/> drops and recreates the database, which
    /// Postgres refuses ("55006: cannot drop the currently open database") while the run's single shared
    /// container (R1) still has this app's own connections open against it. A table truncate resets scenario
    /// data without touching the connection, so the migrated schema (R2) survives every scenario.
    /// </summary>
    public override async Task ResetDatabaseAsync()
    {
        using var scope = CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();

        var tables = dbContext.Model.GetEntityTypes()
            .Select(e => (Schema: e.GetSchema() ?? "public", Table: e.GetTableName()))
            .Where(t => t.Table is not null)
            .Distinct()
            .Select(t => $"\"{t.Schema}\".\"{t.Table}\"")
            .ToList();

        if (tables.Count > 0)
        {
            await dbContext.Database.ExecuteSqlRawAsync(
                $"TRUNCATE TABLE {string.Join(", ", tables)} RESTART IDENTITY CASCADE");
        }

        // The truncate above wipes out the AddCurrencies migration's seed rows along with every other
        // table's data — reseed them the same way TestApiFactoryBase's own InMemory reset does (R2).
        await SeedCurrenciesAsync();

        LogCapture.Clear();
    }

    protected override void AddFeatureOverrides(IDictionary<string, string?> settings)
    {
        // RequireAuthorization is NOT set here — Program.cs binds FeatureOptions eagerly, before this
        // dictionary ever reaches configuration, so it would be silently ineffective (see ApiHooks
        // .BeforeTestRun, which sets it via the one input read early enough: an environment variable).
        // The ledger scenarios exercise real scope-based authorization (§5), paired with
        // LedgerCallerAuthHandler below standing in for the real JWT bearer scheme.

        // Only the @redis scenario passes this. Setting it alone isn't enough to flip AppConfig.AddAppConfig's
        // redis-vs-fallback branch — WebApplicationFactory merges this config in after Program.cs's own
        // startup code already read it, so the ConfigureTestServices override below does the actual swap. Kept
        // here too so anything else that reads ConnectionStrings:Redis at runtime (rather than at startup)
        // sees the real value.
        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            settings["ConnectionStrings:Redis"] = redisConnectionString;
        }
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);

        LedgerCallerAuthHandler.Register(services);

        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            // Program.cs's own AddAppConfig already chose the in-memory idempotency fallback (it ran before
            // the config above was merged in), so replace that choice directly instead.
            services.RemoveAll<IIdempotencyKeyStore>();
            services.RemoveAll<IOptions<IdempotencyOptions>>();
            services.AddIdempotencyWithRedisStore(
                redisConnectionString,
                o => o.ConflictHandling = IdempotentConflictHandling.CachedResult);
        }
    }
}

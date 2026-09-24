using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// A second host on a database of its own inside the run-shared Postgres container, for the scenarios the
/// shared host cannot serve (DRK-1719 §5): the shared database is truncated and re-seeded by hand before every
/// scenario (<see cref="BddApiFactory.ResetDatabaseAsync"/>), so it can prove neither what the migrations seed
/// on a fresh database nor what the upgrade does to data written before it. This host's database is built by
/// the real migrations only — never truncated, never seeded by <see cref="TestApiFactoryBase"/> — and is left
/// behind for the container to discard at the end of the run.
/// </summary>
public sealed class ScratchDatabaseApiFactory : TestApiFactoryBase
{
    /// <summary>The last migration that exists before DRK-1719. "The upgrade" is every migration after it.</summary>
    public const string PreUpgradeMigration = "20260921002809_Initial";

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

    /// <summary>Creates the database and applies every migration, the way a fresh deployment does.</summary>
    public async Task MigrateToLatestAsync()
    {
        using var scope = CreateScope();
        await scope.ServiceProvider.GetRequiredService<CoreDbContext>().Database.MigrateAsync();
    }

    /// <summary>Creates the database and applies the migrations as they stood before DRK-1719, and no more.</summary>
    public async Task MigrateToPreUpgradeAsync()
    {
        using var scope = CreateScope();
        var migrator = scope.ServiceProvider.GetRequiredService<CoreDbContext>().GetService<IMigrator>();
        await migrator.MigrateAsync(PreUpgradeMigration);
    }

    /// <summary>The migrations not yet applied to this database — after <see cref="MigrateToPreUpgradeAsync"/>,
    /// that is the upgrade.</summary>
    public async Task<IReadOnlyList<string>> PendingMigrationsAsync()
    {
        using var scope = CreateScope();
        return [.. await scope.ServiceProvider.GetRequiredService<CoreDbContext>().Database.GetPendingMigrationsAsync()];
    }

    public async Task<IReadOnlyList<string>> AppliedMigrationsAsync()
    {
        using var scope = CreateScope();
        return [.. await scope.ServiceProvider.GetRequiredService<CoreDbContext>().Database.GetAppliedMigrationsAsync()];
    }

    /// <summary>Runs one SQL statement against this host's database, outside the application.</summary>
    public async Task ExecuteAsync(string sql, params object[] parameters)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        foreach (var parameter in parameters)
        {
            command.Parameters.Add(new NpgsqlParameter { Value = parameter });
        }

        await command.ExecuteNonQueryAsync();
    }

    /// <summary>Reads one scalar value from this host's database, outside the application.</summary>
    public async Task<T> ScalarAsync<T>(string sql, params object[] parameters)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        foreach (var parameter in parameters)
        {
            command.Parameters.Add(new NpgsqlParameter { Value = parameter });
        }

        return (T)(await command.ExecuteScalarAsync())!;
    }
}

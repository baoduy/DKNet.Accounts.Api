using DKNet.Accounts.Infra.MsSql;
using DKNet.Accounts.Infra.Postgres;
using SlimMessageBus.Host;
using SlimMessageBus.Host.Outbox;

namespace DKNet.Accounts.Api.Configs;

/// <summary>
/// Chooses the database the service runs on from <see cref="SharedConsts.DatabaseProviderKey"/>.
/// </summary>
[ExcludeFromCodeCoverage]
internal static class DatabaseConfig
{
    #region Methods

    /// <summary>
    /// Reads the database setting: <c>Postgres</c> or <c>SqlServer</c>, compared without regard to case; absent
    /// means <see cref="DatabaseProvider.Postgres"/>; any other value throws <see cref="InvalidOperationException"/>.
    /// </summary>
    public static DatabaseProvider ResolveProvider(IConfiguration configuration)
    {
        var value = configuration[SharedConsts.DatabaseProviderKey];
        if (string.IsNullOrWhiteSpace(value))
        {
            return DatabaseProvider.Postgres;
        }

        // Matched by name only: Enum.TryParse would also take "0" or "1", and would trim a padded value.
        foreach (var provider in Enum.GetValues<DatabaseProvider>())
        {
            if (string.Equals(provider.ToString(), value, StringComparison.OrdinalIgnoreCase))
            {
                return provider;
            }
        }

        throw new InvalidOperationException(
            $"'{value}' is not a supported value for {SharedConsts.DatabaseProviderKey}. Use one of: " +
            $"{string.Join(", ", Enum.GetNames<DatabaseProvider>())}.");
    }

    /// <summary>The chosen database's EF Core provider setup, which brings that database's own migrations.</summary>
    public static Action<DbContextOptionsBuilder, string> UseDatabase(DatabaseProvider provider) =>
        provider == DatabaseProvider.SqlServer
            ? (builder, connectionString) => builder.UseMsSql(connectionString)
            : (builder, connectionString) => builder.UsePostgres(connectionString);

    /// <summary>The chosen database's outbox registration.</summary>
    public static Action<MessageBusBuilder, Action<OutboxSettings>> AddOutbox(DatabaseProvider provider) =>
        provider == DatabaseProvider.SqlServer ? MsSqlSetup.AddMsSqlOutbox : PostgresSetup.AddPostgresOutbox;

    #endregion
}

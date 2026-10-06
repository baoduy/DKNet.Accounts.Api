using DKNet.Accounts.Domains.Share;
using DKNet.Accounts.Infra.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SlimMessageBus.Host;
using SlimMessageBus.Host.Outbox;
using SlimMessageBus.Host.Outbox.PostgreSql.DbContext;

namespace DKNet.Accounts.Infra.Postgres;

/// <summary>
/// PostgreSQL setup for <c>CoreDbContext</c>: the Npgsql provider and this project's own migrations.
/// </summary>
public static class PostgresSetup
{
    /// <summary>
    /// Configures the Npgsql provider, the migrations history table and this assembly's migrations.
    /// </summary>
    /// <param name="builder">The options builder to configure.</param>
    /// <param name="connectionString">The PostgreSQL connection string.</param>
    /// <returns>The configured <see cref="DbContextOptionsBuilder"/>.</returns>
    public static DbContextOptionsBuilder UsePostgres(this DbContextOptionsBuilder builder, string connectionString)
    {
        builder.ConfigureWarnings(warnings => warnings.Log(RelationalEventId.PendingModelChangesWarning));

        return builder.UseNpgsql(
            connectionString,
            o => o
                .MinBatchSize(1)
                .MaxBatchSize(100)
                .MigrationsHistoryTable(nameof(CoreDbContext), DomainSchemas.Migration)
                .MigrationsAssembly(typeof(PostgresSetup).Assembly)
                .EnableRetryOnFailure()
                .UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
    }

    /// <summary>
    /// Keeps outbound events in a PostgreSQL outbox, in the same database and transaction as the ledger change.
    /// </summary>
    /// <param name="builder">The message bus builder to add the outbox to.</param>
    /// <param name="configure">The outbox settings shared by every database.</param>
    public static void AddPostgresOutbox(this MessageBusBuilder builder, Action<OutboxSettings> configure) =>
        builder.AddOutboxUsingDbContext<CoreDbContext>(configure);
}

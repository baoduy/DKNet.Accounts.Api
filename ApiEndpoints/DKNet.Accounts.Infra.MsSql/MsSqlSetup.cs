using DKNet.Accounts.Domains.Share;
using DKNet.Accounts.Infra.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SlimMessageBus.Host;
using SlimMessageBus.Host.Outbox;
using SlimMessageBus.Host.Outbox.Sql.DbContext;

namespace DKNet.Accounts.Infra.MsSql;

/// <summary>
/// SQL Server setup for <c>CoreDbContext</c>: the SQL Server provider and this project's own migrations.
/// </summary>
public static class MsSqlSetup
{
    /// <summary>
    /// Configures the SQL Server provider, the migrations history table and this assembly's migrations.
    /// </summary>
    /// <param name="builder">The options builder to configure.</param>
    /// <param name="connectionString">The SQL Server connection string.</param>
    /// <returns>The configured <see cref="DbContextOptionsBuilder"/>.</returns>
    public static DbContextOptionsBuilder UseMsSql(this DbContextOptionsBuilder builder, string connectionString)
    {
        builder.ConfigureWarnings(warnings => warnings.Log(RelationalEventId.PendingModelChangesWarning));

        return builder.UseSqlServer(
            connectionString,
            o => o
                .MinBatchSize(1)
                .MaxBatchSize(100)
                .MigrationsHistoryTable(nameof(CoreDbContext), DomainSchemas.Migration)
                .MigrationsAssembly(typeof(MsSqlSetup).Assembly)
                .EnableRetryOnFailure()
                .UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
    }

    /// <summary>
    /// Keeps outbound events in a SQL Server outbox, in the same database and transaction as the ledger change.
    /// </summary>
    /// <param name="builder">The message bus builder to add the outbox to.</param>
    /// <param name="configure">The outbox settings shared by every database.</param>
    public static void AddMsSqlOutbox(this MessageBusBuilder builder, Action<OutboxSettings> configure) =>
        builder.AddOutboxUsingDbContext<CoreDbContext>(configure);
}

using DKNet.Accounts.Infra.MsSql;
using DKNet.Accounts.Infra.Postgres;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace DKNet.Accounts.App.Tests.Unit.Configs;

/// <summary>
/// DRK-2120 R2: both databases keep migration history in the same table, migrate."CoreDbContext", and run with the
/// same retry, batching and query-splitting settings. No SQL Server runs in this suite (spec §4), so these are read
/// from the options each database's setup builds rather than from a live database.
/// </summary>
public sealed class DatabaseSetupTests
{
    [Theory]
    [InlineData("Postgres", "Host=localhost;Database=AppDb")]
    [InlineData("SqlServer", "Server=localhost;Database=AppDb")]
    public void EachDatabase_KeepsHistoryInTheSameTable_WithTheSameSettings(string database, string connectionString)
    {
        var builder = new DbContextOptionsBuilder();
        _ = database == "Postgres" ? builder.UsePostgres(connectionString) : builder.UseMsSql(connectionString);

        var relational = builder.Options.Extensions.OfType<RelationalOptionsExtension>().Single();

        relational.MigrationsHistoryTableSchema.ShouldBe("migrate");
        relational.MigrationsHistoryTableName.ShouldBe("CoreDbContext");
        relational.MinBatchSize.ShouldBe(1);
        relational.MaxBatchSize.ShouldBe(100);
        relational.QuerySplittingBehavior.ShouldBe(QuerySplittingBehavior.SplitQuery);
        relational.ExecutionStrategyFactory.ShouldNotBeNull("retry on failure is not configured");
    }
}

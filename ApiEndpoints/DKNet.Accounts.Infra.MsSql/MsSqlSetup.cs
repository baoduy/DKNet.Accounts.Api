using Microsoft.EntityFrameworkCore;

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
    public static DbContextOptionsBuilder UseMsSql(this DbContextOptionsBuilder builder, string connectionString) =>
        throw new NotImplementedException();
}

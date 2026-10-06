using Microsoft.EntityFrameworkCore;

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
    public static DbContextOptionsBuilder UsePostgres(this DbContextOptionsBuilder builder, string connectionString) =>
        throw new NotImplementedException();
}

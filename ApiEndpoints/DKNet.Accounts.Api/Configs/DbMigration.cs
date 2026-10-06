namespace DKNet.Accounts.Api.Configs;

[ExcludeFromCodeCoverage]
internal static class DbMigration
{
    #region Methods

    public static async Task RunMigrationAsync(
        this WebApplicationBuilder builder,
        FeatureOptions features,
        params string[] args)
    {
        var isMigration = args.Any(x => string.Equals(x, "migration", StringComparison.OrdinalIgnoreCase));
        // Resolved before anything else, so an unknown database setting stops the service before it builds.
        var useDatabase = DatabaseConfig.UseDatabase(DatabaseConfig.ResolveProvider(builder.Configuration));
        var connectionString = builder.Configuration.GetConnectionString(SharedConsts.DbConnectionString)!;

        if (isMigration)
        {
            Console.WriteLine("Running Db migration...");
            await InfraMigration.MigrateDb(connectionString, useDatabase);
            Console.WriteLine("Db migration is completed");

            Environment.Exit(0);
        }
        else if (features.RunDbMigrationWhenAppStart)
        {
            // Unlike the `migration` CLI arg above, this runs the migration as part of normal app
            // startup and does not exit — the host keeps serving afterward.
            Console.WriteLine("Running Db migration on app start...");
            await InfraMigration.MigrateDb(connectionString, useDatabase);
            Console.WriteLine("Db migration is completed");
        }
    }

    #endregion
}
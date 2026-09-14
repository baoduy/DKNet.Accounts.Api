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

        if (isMigration)
        {
            Console.WriteLine("Running Db migration...");
            await InfraMigration.MigrateDb(builder.Configuration.GetConnectionString(SharedConsts.DbConnectionString)!);
            Console.WriteLine("Db migration is completed");

                Environment.Exit(0);
        }
    }

    #endregion
}
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// A host composed by the API's own startup code, with nothing about the database substituted — unlike
/// <see cref="TestApiFactoryBase"/>, which swaps <see cref="CoreDbContext"/> for a provider of the test's choosing,
/// so the provider, migrations and generators seen here are the ones a deployment gets (DRK-2120 surface A).
/// The database setting and connection string arrive as environment variables, the one input Program.cs reads
/// before the host is built (see <see cref="ApiHooks.BeforeTestRun"/>), and are cleared again once the host is
/// built. Hosted services (message bus, outbox) are removed so nothing connects at start-up: these scenarios point
/// the host at a server that does not exist.
/// </summary>
public sealed class DatabaseSettingApiFactory : WebApplicationFactory<DKNet.Accounts.Api.Program>
{
    private DatabaseSettingApiFactory()
    {
    }

    /// <summary>
    /// Builds and starts the host. <paramref name="setting"/> null leaves the database setting absent. Returns the
    /// started host, or the exception the API's start-up threw (the factory is then already disposed).
    /// </summary>
    public static async Task<(DatabaseSettingApiFactory? Host, Exception? StartupError)> StartAsync(
        string? setting, string connectionString, bool runDbMigrationWhenAppStart = false)
    {
        var variables = new Dictionary<string, string?>
        {
            ["Database__Provider"] = setting,
            ["ConnectionStrings__AppDb"] = connectionString,
            ["FeatureManagement__RunDbMigrationWhenAppStart"] = runDbMigrationWhenAppStart ? "true" : "false"
        };
        var previous = variables.Keys.ToDictionary(k => k, Environment.GetEnvironmentVariable);

        var factory = new DatabaseSettingApiFactory();
        try
        {
            foreach (var (name, value) in variables)
            {
                Environment.SetEnvironmentVariable(name, value);
            }

            _ = factory.Services;
            return (factory, null);
        }
        catch (Exception ex)
        {
            await factory.DisposeAsync();
            return (null, ex);
        }
        finally
        {
            foreach (var (name, value) in previous)
            {
                Environment.SetEnvironmentVariable(name, value);
            }
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services => services.RemoveAll<IHostedService>());
    }
}

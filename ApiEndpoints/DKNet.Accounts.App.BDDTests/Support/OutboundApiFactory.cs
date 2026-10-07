using DKNet.Accounts.Domains.Services;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// A host of its own for the outbound-events scenarios (DRK-1773 §5), on a database of its own inside the
/// run-shared Postgres container, configured for the message bus through the given environment. The shared
/// <see cref="BddApiFactory"/> host runs with the bus off and is left exactly as it was.
/// </summary>
/// <remarks>
/// <para>
/// Program.cs reads <c>FeatureManagement</c>, the bus settings and the database connection while it registers
/// services, before the settings dictionary of <see cref="TestApiFactoryBase"/> is merged in — the same reason
/// <see cref="ApiHooks.BeforeTestRun"/> sets <c>RequireAuthorization</c> through an environment variable. Every
/// such setting is therefore passed as an environment variable, set only while <c>CreateClient</c> builds the
/// host. <c>RunDbMigrationWhenAppStart</c> creates and migrates the database on start, the way the compose stack
/// does, so a restarted host finds its data where the previous one left it.
/// </para>
/// <para>
/// Unlike the base, the production <c>CoreDbContext</c> registration is kept: these scenarios are about what the
/// real save path stores and sends. Only the membership service and the authentication scheme are swapped.
/// </para>
/// </remarks>
public sealed class OutboundApiFactory : TestApiFactoryBase
{
    private readonly string _connectionString;
    private readonly Action<IServiceCollection>? _configureServices;

    /// <param name="connectionString">The host's database; created on start when missing.</param>
    /// <param name="environment">Environment variables (<c>Section__Key</c>) read while the host is built.</param>
    /// <param name="configureServices">Further test substitutions, applied after the base ones.</param>
    public OutboundApiFactory(string connectionString, IReadOnlyDictionary<string, string?> environment,
        Action<IServiceCollection>? configureServices = null)
    {
        _connectionString = connectionString;
        _configureServices = configureServices;

        var variables = new Dictionary<string, string?>(environment)
        {
            ["FeatureManagement__RequireAuthorization"] = "true",
            ["FeatureManagement__RunDbMigrationWhenAppStart"] = "true",
            ["ConnectionStrings__AppDb"] = connectionString
        };

        foreach (var (key, value) in variables)
        {
            Environment.SetEnvironmentVariable(key, value);
        }

        try
        {
            Client = CreateClient();
        }
        finally
        {
            foreach (var key in variables.Keys)
            {
                Environment.SetEnvironmentVariable(key, null);
            }
        }
    }

    public HttpClient Client { get; }

    protected override string DbConnectionString => _connectionString;

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.RemoveAll<IMembershipService>();
        services.AddSingleton<IMembershipService, TestMembershipService>();
        LedgerCallerAuthHandler.Register(services);
        _configureServices?.Invoke(services);
    }
}

using DKNet.Accounts.Domains.Services;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// The ledger service as AppHost runs it for DRK-1796: sign-in and scope checks on, and every
/// <c>Authentication__*</c> setting exactly as the AppHost manifest hands it to the <c>Api</c> resource — so its
/// real JWT bearer scheme trusts the running AppHost's Keycloak and nothing else. Unlike every other factory here,
/// the authentication scheme is NOT swapped for a test handler.
/// </summary>
/// <remarks>
/// It listens on a real local port (Kestrel), so TrafficGen can reach it as a separate process. Its database is
/// its own, inside the run-shared Postgres container; the message bus stays off — neither is what these scenarios
/// are about, and AppHost's own Redis, Postgres and RabbitMQ are not reachable at a fixed address. Settings go in as
/// environment variables for the reason <see cref="OutboundApiFactory"/> gives.
/// </remarks>
public sealed class KeycloakApiFactory : TestApiFactoryBase
{
    private const string RequireAuthorizationKey = "FeatureManagement__RequireAuthorization";

    private static KeycloakApiFactory? _current;
    private static int _generation;

    private readonly string _connectionString;

    private KeycloakApiFactory(IReadOnlyDictionary<string, string> signInSettings)
    {
        _connectionString = new NpgsqlConnectionStringBuilder(ApiHooks.Factory.ContainerConnectionString)
        {
            Database = $"apphost_{Guid.NewGuid():N}"
        }.ConnectionString;

        var variables = new Dictionary<string, string?>(signInSettings.ToDictionary(s => s.Key, s => (string?)s.Value))
        {
            ["FeatureManagement__RunDbMigrationWhenAppStart"] = "true",
            ["FeatureManagement__EnableServiceBus"] = "false",
            ["ConnectionStrings__AppDb"] = _connectionString
        };

        foreach (var (key, value) in variables)
        {
            Environment.SetEnvironmentVariable(key, value);
        }

        try
        {
            UseKestrel(0);
            StartServer();
            Client = CreateClient();
        }
        finally
        {
            foreach (var key in variables.Keys)
            {
                Environment.SetEnvironmentVariable(key, null);
            }
        }

        BaseAddress = new Uri(Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!
            .Addresses.First());
    }

    public HttpClient Client { get; }

    /// <summary>Where a separate process (TrafficGen) reaches this ledger service.</summary>
    public Uri BaseAddress { get; }

    /// <summary>
    /// A key the scenarios hold, added to the demo realm before this host first reads the realm's keys: the bearer
    /// scheme fetches keys again for an unknown key id at most once every 5 minutes, so a key added later would be
    /// refused for that reason instead of the one a scenario is about.
    /// </summary>
    public TokenSigner ScenarioSigner { get; private init; } = null!;

    /// <summary>The ledger host for the running AppHost, started with its settings on first use — and again after
    /// the AppHost restarts, since the realm then signs with new keys.</summary>
    public static async Task<KeycloakApiFactory> CurrentAsync()
    {
        await AppHostRun.EnsureRunningAsync();
        if (_current is not null && _generation == AppHostRun.Generation)
        {
            return _current;
        }

        await DisposeCurrentAsync();
        var adminScreen = await DemoRealm.SignInToAdminScreenAsync(DemoRealm.AdminLogin, DemoRealm.AdminLogin);
        var signer = await DemoRealm.AddScenarioSigningKeyAsync(adminScreen);
        _current = new KeycloakApiFactory(SignInSettings()) { ScenarioSigner = signer };
        _generation = AppHostRun.Generation;
        return _current;
    }

    public static async Task DisposeCurrentAsync()
    {
        if (_current is not null)
        {
            await _current.DisposeAsync();
            _current = null;
        }
    }

    /// <summary>
    /// What AppHost gives the ledger service for sign-in: scope checks switched on (DRK-1796 §3 row 4) and the
    /// bearer scheme's settings pointing at the demo realm. The only relaxation allowed is plain-HTTP key fetching
    /// (R4); the ledger still checks signature, issuer, audience and lifetime.
    /// </summary>
    public static IReadOnlyDictionary<string, string> SignInSettings()
    {
        var settings = AppHostRun.Manifest.Environment("Api",
            key => key == RequireAuthorizationKey || key.StartsWith("Authentication__", StringComparison.Ordinal));

        settings.GetValueOrDefault(RequireAuthorizationKey).ShouldBe("true",
            "AppHost must switch the ledger service's sign-in and scope checks on.");
        settings.GetValueOrDefault("Authentication__Schemes__Bearer__ValidIssuer").ShouldBe(AppHostRun.RealmIssuer);
        settings.GetValueOrDefault("Authentication__Schemes__Bearer__MetadataAddress")
            .ShouldBe($"{AppHostRun.RealmIssuer}/.well-known/openid-configuration");
        settings.GetValueOrDefault("Authentication__Schemes__Bearer__ValidAudiences__0").ShouldBe(AppHostRun.LedgerAudience);
        settings.GetValueOrDefault("Authentication__Schemes__Bearer__RequireHttpsMetadata").ShouldBe("false");
        return settings;
    }

    protected override string DbConnectionString => _connectionString;

    /// <summary>As <see cref="OutboundApiFactory"/>: the production database registration is kept, and migrated on
    /// start; only the membership service is swapped.</summary>
    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.RemoveAll<IMembershipService>();
        services.AddSingleton<IMembershipService, TestMembershipService>();
    }
}

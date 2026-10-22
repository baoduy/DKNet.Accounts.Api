using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// DRK-2365 host for one set of early-bound settings. <c>Program.cs</c> reads feature flags and the
/// <c>Security</c>/<c>Cors</c>/<c>RateLimit</c> sections from <c>builder.Configuration</c> before
/// <see cref="TestApiFactoryBase.ConfigureWebHost" /> merges its overrides (see <see cref="AuthOnApiFixture" />),
/// so the settings are set as environment variables around the one <c>CreateClient</c> call that builds the host,
/// then restored. A request names its immediate peer with <see cref="RemoteIpTestStartupFilter" /> and reads the
/// client address the host settled on from <see cref="SeenClientEchoStartupFilter.SeenClientHeader" />.
/// </summary>
public abstract class EnvOverrideApiFixture(IReadOnlyDictionary<string, string?> envOverrides)
    : TestApiFactoryBase, IAsyncLifetime
{
    public async Task InitializeAsync()
    {
        using (new EnvironmentOverride(envOverrides))
        {
            _ = CreateClient();
        }

        await ResetDatabaseAsync();
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services => services
            .AddSingleton<IStartupFilter, RemoteIpTestStartupFilter>()
            .AddSingleton<IStartupFilter, SeenClientEchoStartupFilter>());
    }
}

/// <summary>Sets environment variables for its lifetime and puts the previous values back on dispose.</summary>
public sealed class EnvironmentOverride : IDisposable
{
    private readonly Dictionary<string, string?> _previous = [];

    public EnvironmentOverride(IReadOnlyDictionary<string, string?> values)
    {
        foreach (var (key, value) in values)
        {
            _previous[key] = Environment.GetEnvironmentVariable(key);
            Environment.SetEnvironmentVariable(key, value);
        }
    }

    public void Dispose()
    {
        foreach (var (key, value) in _previous)
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}

/// <summary>
/// Echoes <c>HttpContext.Connection.RemoteIpAddress</c> as the response starts — after the forwarded-headers
/// middleware has had its say — so a test reads the client address the host settled on.
/// </summary>
public sealed class SeenClientEchoStartupFilter : IStartupFilter
{
    public const string SeenClientHeader = "X-Test-Seen-Client";

    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
    {
        app.Use((context, nextMiddleware) =>
        {
            context.Response.OnStarting(() =>
            {
                context.Response.Headers[SeenClientHeader] = context.Connection.RemoteIpAddress?.ToString() ?? "none";
                return Task.CompletedTask;
            });
            return nextMiddleware();
        });

        next(app);
    };
}

/// <summary>Forwarded headers on, trusting the network 10.0.0.0/8 and no single proxy.</summary>
public sealed class TrustedNetworkApiFixture() : EnvOverrideApiFixture(new Dictionary<string, string?>
{
    ["FeatureManagement__EnableForwardedHeaders"] = "true",
    ["Security__TrustedNetworks__0"] = "10.0.0.0/8"
});

/// <summary>Rate limiting on at 2 requests per second per caller.</summary>
public sealed class TwoPerSecondRateLimitApiFixture() : EnvOverrideApiFixture(new Dictionary<string, string?>
{
    ["FeatureManagement__EnableRateLimit"] = "true",
    ["RateLimit__DefaultRequestLimit"] = "2",
    ["RateLimit__TimeWindowInSeconds"] = "1"
});

/// <summary>Rate limiting on with the shipped <c>RateLimit</c> section of <c>appsettings.json</c> untouched.</summary>
public sealed class ShippedRateLimitApiFixture() : EnvOverrideApiFixture(new Dictionary<string, string?>
{
    ["FeatureManagement__EnableRateLimit"] = "true"
});

/// <summary>
/// HTTPS on, with an HTTPS port known so <c>UseHttpsRedirection</c> can actually redirect under TestServer — the
/// presence sibling of <see cref="FeaturesSwitchedOffApiFixture" />'s "not redirected".
/// </summary>
public sealed class HttpsOnApiFixture() : EnvOverrideApiFixture(new Dictionary<string, string?>
{
    ["FeatureManagement__EnableHttps"] = "true",
    ["ASPNETCORE_HTTPS_PORT"] = "443"
});

/// <summary>
/// HTTPS, rate limiting and forwarded headers each switched off by their own flag, with the settings each would
/// act on still present: an HTTPS port, the shipped rate limit, and the trusted network 10.0.0.0/8.
/// </summary>
public sealed class FeaturesSwitchedOffApiFixture() : EnvOverrideApiFixture(new Dictionary<string, string?>
{
    ["FeatureManagement__EnableHttps"] = "false",
    ["FeatureManagement__EnableRateLimit"] = "false",
    ["FeatureManagement__EnableForwardedHeaders"] = "false",
    ["ASPNETCORE_HTTPS_PORT"] = "443",
    ["Security__TrustedNetworks__0"] = "10.0.0.0/8"
});

/// <summary>
/// Real Kestrel process with request bounds switched off by their flag while the <c>RequestBounds</c> section
/// still states a 1 MiB body maximum.
/// </summary>
public sealed class RequestBoundsOffRealProcessApiFixture : RealProcessApiFixtureBase
{
    protected override string EnvironmentName => "Testing";

    protected override IReadOnlyDictionary<string, string?> EnvironmentOverrides { get; } = new Dictionary<string, string?>
    {
        ["FeatureManagement__RunDbMigrationWhenAppStart"] = "false",
        ["FeatureManagement__EnableSwagger"] = "false",
        ["FeatureManagement__EnableAzureAppConfig"] = "false",
        ["FeatureManagement__EnableRequestBounds"] = "false",
        ["RequestBounds__MaxRequestBodySizeBytes"] = "1048576"
    };
}

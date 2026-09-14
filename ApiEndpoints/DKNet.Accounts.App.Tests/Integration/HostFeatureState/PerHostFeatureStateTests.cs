using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.HostFeatureState;

/// <summary>
/// DRK-500 §3's marquee regression scenario: "Two API hosts in one process configure independently". Feature
/// flags used to be recorded via process-wide statics (e.g. the old <c>AuthConfig.IsAuthConfigAdded</c>) —
/// whichever host started first decided every other host's middleware for the lifetime of the process. This
/// must fail against that implementation (the relaxed host would inherit the strict host's authorization
/// requirement) and pass now that <see cref="DKNet.Accounts.Api.Configs.HostConfigMarker"/> scopes the "was this
/// config added" flag to each host's own <see cref="IServiceProvider"/>.
/// </summary>
/// <remarks>
/// <c>FeatureOptions</c> is bound once, eagerly, into a plain local in <c>Program.cs</c> from
/// <c>builder.Configuration</c> before <c>WebApplication.CreateBuilder</c> returns — a
/// <see cref="TestApiFactoryBase.AddFeatureOverrides"/>/<c>ConfigureTestServices</c> override only reaches
/// <c>IConfiguration</c> after that bind already ran (see the equivalent note on
/// <see cref="DKNet.Accounts.App.BDDTests.Support.BddApiFactory"/> for the idempotency store), so it cannot flip this
/// flag per host. An environment variable is the one input <c>CreateBuilder</c> itself reads early enough —
/// set immediately before <see cref="Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory{TEntryPoint}.CreateClient"/>
/// triggers the host build, and restored immediately after.
/// </remarks>
public sealed class PerHostFeatureStateTests
{
    private const string RequireAuthorizationEnvVar = "FeatureManagement__RequireAuthorization";

    #region Methods

    [Fact]
    public async Task TwoHostsInOneProcess_ShouldConfigureAuthorizationIndependently()
    {
        // Order matters for reproducing the regression: the strict host must build (and flip the old static)
        // BEFORE the relaxed host, so a leak would show up as the relaxed host wrongly requiring auth too.
        await using var strictHost = new PlainFactory($"host-state-{Guid.NewGuid():N}");
        using var strictClient = CreateClientWithRequireAuthorization(strictHost, required: true);

        await using var relaxedHost = new PlainFactory($"host-state-{Guid.NewGuid():N}");
        using var relaxedClient = CreateClientWithRequireAuthorization(relaxedHost, required: false);

        const string listUrl = "/v1/account-groups?pageIndex=1&pageSize=10";
        var strictResponse = await strictClient.GetAsync(listUrl);
        var relaxedResponse = await relaxedClient.GetAsync(listUrl);

        strictResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized,
            "the strict host has RequireAuthorization=true and no bearer token was sent.");
        // The handler behind this route is not implemented yet (DRK-1250 §4), so it 500s rather than 200 —
        // the property this regression test protects is host isolation, not a working handler: the relaxed
        // host must reach the handler at all (i.e. must not also 401) rather than inherit the strict host's
        // requirement.
        relaxedResponse.StatusCode.ShouldNotBe(HttpStatusCode.Unauthorized,
            "the relaxed host has RequireAuthorization=false and must not inherit the strict host's requirement.");
    }

    private sealed class PlainFactory(string dbName) : TestApiFactoryBase(dbName);

    private static HttpClient CreateClientWithRequireAuthorization(TestApiFactoryBase factory, bool required)
    {
        var previous = Environment.GetEnvironmentVariable(RequireAuthorizationEnvVar);
        Environment.SetEnvironmentVariable(RequireAuthorizationEnvVar, required ? "true" : "false");
        try
        {
            // CreateClient() is what actually triggers the deferred host build (and thus Program.cs's eager
            // FeatureOptions bind) — the env var must be in place for this call and nothing after it.
            return factory.CreateClient();
        }
        finally
        {
            Environment.SetEnvironmentVariable(RequireAuthorizationEnvVar, previous);
        }
    }

    #endregion
}

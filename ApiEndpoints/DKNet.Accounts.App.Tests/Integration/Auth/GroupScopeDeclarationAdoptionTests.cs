using System.Net.Http.Json;
using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using DKNet.AspCore.Extensions;
using DKNet.AspCore.Extensions.Endpoints;
using DKNet.Accounts.Api.ApiEndpoints.Accounts;
using DKNet.Accounts.Api.ApiEndpoints.Postings;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.Auth;

/// <summary>
/// DRK-1556 §5: the accounts API states its group-wide scopes with the endpoint package's own
/// <see cref="EndpointGroupScopeAttribute"/> instead of the API's own (now-deleted) group-wide mechanism.
/// </summary>
/// <remarks>
/// Scenarios 1-3 drive the SHIPPED <see cref="AccountsV1Endpoint"/> group through <see cref="LedgerApiFixture"/>
/// and assert two things: the group states its scope with the package attribute (reflection - this is "the
/// declaration" a Given clause names, and is what makes each scenario red today: <see cref="AccountsV1Endpoint"/>
/// still states its scopes with the API's own <c>DeclareGroupScope</c> call inside <c>Map</c>, not with the class
/// attribute) and the caller-facing behaviour is unchanged (the HTTP half). Scenario 5 is a regression guard the
/// R2 rule already promises stays true - it exercises behaviour this change does not touch (a group that
/// declares nothing), so it is green from authoring; that is the point, not a defect (DRK-1556 section 3 "Must
/// stay true"). Scenario 8 ("No route changes the scope it requires") already has its own assertion:
/// <see cref="DKNet.Accounts.App.Tests.Architecture.RouteScopeCoverageTests"/>, kept unchanged. Scenarios 4, 7
/// and 9 live in <see cref="GroupScopeDeclarationStandaloneTests"/> below, not here - see that class's own
/// remarks for why.
/// </remarks>
public sealed class GroupScopeDeclarationAdoptionTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private HttpClient Client => fixture.CreateClient();

    private static HttpRequestMessage AsCaller(HttpMethod method, string uri, string clientId, string? scope, object? body = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, clientId);
        if (scope is not null)
        {
            request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, scope);
        }

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    private async Task<Guid> OpenAccountAsync(string classification = "Asset")
    {
        var response = await Client.SendAsync(AsCaller(HttpMethod.Post, "/v1/accounts", "fixture-setup",
            string.Join(' ', ScopeNames.All), new
            {
                groupId = Guid.NewGuid(),
                name = "Operating",
                currency = "SGD",
                classification,
                permittedToGoNegative = false
            }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    /// <summary>A Credit posting increases a Liability account's balance, so it never goes below the floor.</summary>
    private Task<Guid> OpenLiabilityAccountAsync() => OpenAccountAsync("Liability");

    /// <summary>
    /// "The declaration" half of a Given clause naming a group scope: asserts the package attribute, never the
    /// resulting HTTP behaviour (that is the separate When/Then half). Red today - <typeparamref name="TConfig"/>
    /// still states its scopes with the API's own, now-deleted <c>DeclareGroupScope</c> call.
    /// </summary>
    private static void AssertGroupDeclares<TConfig>(string scope, string httpMethod) where TConfig : IEndpointConfig
    {
        var declarations = typeof(TConfig).GetCustomAttributes<EndpointGroupScopeAttribute>().ToList();
        declarations.ShouldContain(
            d => d.Scope == scope && d.HttpMethods.Contains(httpMethod, StringComparer.OrdinalIgnoreCase),
            $"{typeof(TConfig).Name} should declare '{scope}' for {httpMethod} with an EndpointGroupScopeAttribute above its group.");
    }

    private static void AssertGroupDeclaresNothing<TConfig>() where TConfig : IEndpointConfig =>
        typeof(TConfig).GetCustomAttributes<EndpointGroupScopeAttribute>().ShouldBeEmpty();

    /// <summary>Scenario: A read route accepts a caller holding the group's read scope.</summary>
    [Fact]
    public async Task ReadRoute_AcceptsACallerHoldingTheGroupsReadScope()
    {
        AssertGroupDeclares<AccountsV1Endpoint>(ScopeNames.AccountsRead, EndpointHttpMethods.Get);

        var accountId = await OpenAccountAsync();
        var response = await Client.SendAsync(
            AsCaller(HttpMethod.Get, $"/v1/accounts/{accountId}", "treasury-ops", ScopeNames.AccountsRead));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    /// <summary>Scenario: A write route refuses a caller holding only the read scope.</summary>
    [Fact]
    public async Task WriteRoute_RefusesACallerHoldingOnlyTheReadScope()
    {
        AssertGroupDeclares<AccountsV1Endpoint>(ScopeNames.AccountsWrite, EndpointHttpMethods.Put);

        var accountId = await OpenAccountAsync();
        var response = await Client.SendAsync(AsCaller(HttpMethod.Put, $"/v1/accounts/{accountId}",
            "treasury-ops", ScopeNames.AccountsRead, new { name = "Renamed" }));

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    /// <summary>Scenario: A route that names its own scope keeps it.</summary>
    [Fact]
    public async Task RouteThatNamesItsOwnScope_KeepsIt()
    {
        AssertGroupDeclares<AccountsV1Endpoint>(ScopeNames.AccountsRead, EndpointHttpMethods.Get);

        var accountId = await OpenAccountAsync();
        var response = await Client.SendAsync(AsCaller(HttpMethod.Get, $"/v1/accounts/{accountId}/statement",
            "treasury-ops", ScopeNames.PostingsRead));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    /// <summary>
    /// Scenario: A group that declares nothing above it keeps today's behaviour (R2). Regression guard: the
    /// posting endpoints never carried a group-wide declaration under either mechanism, so this is unaffected by
    /// the change and green from authoring - not a defect, the point of the scenario.
    /// </summary>
    [Fact]
    public async Task GroupThatDeclaresNothingAboveIt_KeepsTodaysBehaviour()
    {
        AssertGroupDeclaresNothing<PostingsV1Endpoint>();

        var accountId = await OpenLiabilityAccountAsync();
        var recordResponse = await Client.SendAsync(AsCaller(HttpMethod.Post, "/v1/postings", "fixture-setup",
            string.Join(' ', ScopeNames.All), new
            {
                accountId,
                direction = "Credit",
                amount = 10m,
                currency = "SGD",
                category = "Transfer"
            }));
        var recordBody = await recordResponse.Content.ReadAsStringAsync();
        recordResponse.StatusCode.ShouldBe(HttpStatusCode.Created, recordBody);
        var postingId = JsonDocument.Parse(recordBody).RootElement.GetProperty("id").GetGuid();

        var response = await Client.SendAsync(
            AsCaller(HttpMethod.Get, $"/v1/postings/{postingId}", "treasury-ops", ScopeNames.PostingsRead));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }
}

/// <summary>
/// Scenarios 4, 7 and 9 deliberately carry NO <see cref="LedgerApiFixture"/>/<see cref="AuthOnApiFixture"/> class
/// fixture: those fixtures each force <c>FeatureManagement__RequireAuthorization</c> to <c>true</c> via an
/// environment variable for their whole class-fixture lifetime (read while <c>WebApplication.CreateBuilder</c>
/// builds its very first configuration, ahead of any per-test override - see <see cref="AuthOnApiFixture"/>'s
/// own remarks), so a plain <see cref="ApiFixture"/> built inside a test in a class that also depends on one of
/// them would inherit "authorization required" instead of the Testing environment's own default (false). The
/// original DRK-1498 authors hit exactly this and kept the auth-off scenario in an unfixtured class for the same
/// reason (<c>GroupScopeCoverageTests</c>, deleted by this change's row 6).
/// </summary>
public sealed class GroupScopeDeclarationStandaloneTests
{
    internal const string TestOnlyScope = "test-only.declared-scope";

    /// <summary>
    /// Builds a host through the package's real, public <see cref="EndpointConfigExtensions.UseEndpointConfigs"/>
    /// wiring - scanning only this test assembly, whose only <see cref="IEndpointConfig"/> implementations are
    /// the two test-only groups below, so a shipped group can never leak in.
    /// </summary>
    private static async Task<WebApplication> BuildTestOnlyHostAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.AddRouting();
        LedgerCallerAuthHandler.Register(builder.Services);
        builder.Services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
            options.AddPolicy(TestOnlyScope, policy => policy.Requirements.Add(new HasScopeRequirement(TestOnlyScope)));
        });
        builder.Services.AddSingleton<IAuthorizationHandler, HasScopeHandler>();

        var app = builder.Build();
        app.UseRouting();
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseEndpointConfigs(o =>
        {
            o.RequireAuthorization = true;
            o.EnableVersioning = false;
        }, typeof(GroupScopeDeclarationStandaloneTests).Assembly);

        return app;
    }

    /// <summary>Scenario: A route open to anonymous callers needs no token.</summary>
    [Fact]
    public async Task AnonymousRoute_InADeclaringTestOnlyGroup_NeedsNoToken()
    {
        var app = await BuildTestOnlyHostAsync();
        await using var _ = app;
        await app.StartAsync();

        var response = await app.GetTestClient().GetAsync("/test-only-anonymous-group/open");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    /// <summary>Scenario: A route added to a declaring group requires the group's scope (asserted on the live
    /// endpoint metadata, not an HTTP call - DRK-1556 section 5 tags this scenario @unit). "/new-route" carries
    /// no per-route scope call of its own - the group's declaration is the only thing that could give it a
    /// policy.</summary>
    [Fact]
    public async Task RouteAddedToADeclaringGroup_RequiresTheGroupsScope()
    {
        var app = await BuildTestOnlyHostAsync();
        await using var _ = app;
        await app.StartAsync();

        var dataSource = app.Services.GetRequiredService<EndpointDataSource>();
        var newEndpoint = dataSource.Endpoints.OfType<RouteEndpoint>()
            .Single(e => e.RoutePattern.RawText == "/test-only-inheritance-group/new-route");

        var policies = newEndpoint.Metadata.GetOrderedMetadata<IAuthorizeData>()
            .Select(a => a.Policy)
            .Where(p => p is not null)
            .ToList();

        policies.ShouldContain(TestOnlyScope);
    }

    /// <summary>
    /// Scenario: A host with authorization switched off serves every route (R4). Regression guard: the
    /// declaration is inert with authorization off under either mechanism, so this is unaffected by the change
    /// and green from authoring.
    /// </summary>
    [Fact]
    public async Task HostWithAuthorizationSwitchedOff_ServesEveryRoute()
    {
        using var apiFixture = new ApiFixture();
        await apiFixture.InitializeAsync();
        var client = apiFixture.CreateClient();

        var createResponse = await client.PostAsJsonAsync("/v1/account-groups", new
        {
            code = $"GRP-{Guid.NewGuid():N}",
            name = "Auth-off test group",
            type = "Customer",
            ownerId = "treasury-ops"
        });
        createResponse.EnsureSuccessStatusCode();
        var groupId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var readResponse = await client.GetAsync($"/v1/account-groups/{groupId}");

        readResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
    }
}

/// <summary>Test-only group for the anonymous-route scenario - never registered into <c>Program.cs</c>'s
/// assembly scan, so it never ships.</summary>
[EndpointGroupScope(GroupScopeDeclarationStandaloneTests.TestOnlyScope, EndpointHttpMethods.Get)]
internal sealed class TestOnlyAnonymousRouteEndpointConfig : IEndpointConfig
{
    public int Version => 1;
    public string GroupEndpoint => "/test-only-anonymous-group";
    public void Map(RouteGroupBuilder group) => group.MapGet("/open", () => Results.Ok()).AllowAnonymous();
}

/// <summary>Test-only group for the scope-inheritance scenario - never registered into <c>Program.cs</c>'s
/// assembly scan, so it never ships. Maps two routes under the SAME declaration: "/existing" only establishes
/// the group actually declares something; "/new-route" is the one the scenario asserts on, with nothing of its
/// own beyond being mapped inside this group.</summary>
[EndpointGroupScope(GroupScopeDeclarationStandaloneTests.TestOnlyScope, EndpointHttpMethods.Get)]
internal sealed class TestOnlyScopeInheritanceEndpointConfig : IEndpointConfig
{
    public int Version => 1;
    public string GroupEndpoint => "/test-only-inheritance-group";

    public void Map(RouteGroupBuilder group)
    {
        group.MapGet("/existing", () => Results.Ok());
        group.MapGet("/new-route", () => Results.Ok());
    }
}

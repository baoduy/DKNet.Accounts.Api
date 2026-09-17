using System.Net.Http.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.Auth;

/// <summary>
/// DRK-1498 §5 acceptance criteria that need a test-only endpoint group (§3 row 8) — a declaring group with
/// an anonymous route, and a declaring group serving an undeclared method — plus the auth-switched-off
/// scenario. The test-only groups here are built directly with <see cref="TestServer"/> and never registered
/// into <c>Program.cs</c>'s assembly scan, so they never ship. Every scenario calls
/// <see cref="GroupScopeAuthorization.DeclareGroupScope"/> and/or
/// <see cref="GroupScopeAuthorization.EnsureGroupScopeCoverage"/> directly, both still
/// <see cref="NotImplementedException"/> stubs, so every scenario here is red for that one nameable reason —
/// see <see cref="DKNet.Accounts.App.Tests.Architecture.GroupScopeDeclarationTests"/>'s class doc comment for
/// the same convention against the shipped groups.
/// </summary>
public sealed class GroupScopeCoverageTests
{
    private const string TestGroupName = "test-only-group";

    private static async Task<IHost> BuildTestHostAsync(Action<IEndpointRouteBuilder> configureEndpoints)
    {
        var hostBuilder = new HostBuilder()
            .ConfigureWebHost(webHost =>
            {
                webHost.UseTestServer();
                webHost.ConfigureServices(services =>
                {
                    services.AddRouting();
                    LedgerCallerAuthHandler.Register(services);
                    services.AddAuthorization(options =>
                    {
                        options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
                        foreach (var scope in ScopeNames.All)
                        {
                            options.AddPolicy(scope, policy => policy.Requirements.Add(new HasScopeRequirement(scope)));
                        }
                    });
                    services.AddSingleton<IAuthorizationHandler, HasScopeHandler>();
                });
                webHost.Configure(app =>
                {
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.UseEndpoints(configureEndpoints);
                });
            });

        return await hostBuilder.StartAsync();
    }

    /// <summary>Scenario: A route opened to anonymous callers needs no token.</summary>
    [Fact]
    public async Task AnonymousRoute_InADeclaringTestOnlyGroup_NeedsNoToken()
    {
        using var host = await BuildTestHostAsync(endpoints =>
        {
            var group = endpoints.MapGroup($"/{TestGroupName}").WithDisplayName(TestGroupName);
            group.DeclareGroupScope(ScopeNames.AccountsRead, "GET");
            group.MapGet("/open", () => Results.Ok()).AllowAnonymous();
        });

        var client = host.GetTestClient();
        var response = await client.GetAsync($"/{TestGroupName}/open");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    /// <summary>Scenario: A method with no declared scope stops the API at startup.</summary>
    [Fact]
    public async Task MethodWithNoDeclaredScope_StopsTheApiAtStartup()
    {
        IReadOnlyList<Endpoint>? endpoints = null;

        using (var host = await BuildTestHostAsync(routeBuilder =>
               {
                   var group = routeBuilder.MapGroup($"/{TestGroupName}").WithDisplayName(TestGroupName);
                   group.DeclareGroupScope(ScopeNames.AccountsRead, "GET");
                   group.DeclareGroupScope(ScopeNames.AccountsWrite, "PUT");
                   group.MapGet("/{id:guid}", (Guid id) => Results.Ok());
                   group.MapPut("/{id:guid}", (Guid id) => Results.Ok());
                   // DELETE serves this group but no declaration, no per-route scope and no AllowAnonymous
                   // covers it — this is the uncovered method the coverage check must name (R5).
                   group.MapDelete("/{id:guid}", (Guid id) => Results.Ok());
               }))
        {
            endpoints = [.. host.Services.GetRequiredService<EndpointDataSource>().Endpoints];
        }

        var exception = Should.Throw<InvalidOperationException>(() => GroupScopeAuthorization.EnsureGroupScopeCoverage(endpoints));
        exception.Message.ShouldContain(TestGroupName);
        exception.Message.ShouldContain("DELETE");
    }

    /// <summary>Scenario: A host with authorization switched off serves every route.</summary>
    [Fact]
    public async Task HostWithAuthorizationSwitchedOff_ServesEveryRoute()
    {
        // ApiFixture runs under appsettings.Testing.json, where RequireAuthorization is false — AppConfig.
        // AddAppConfig then never calls AddAuthConfig, so UseAuthConfig wires no authentication/authorization
        // middleware at all (AppConfig.cs:25-28,96): a request with no token whatsoever must still succeed.
        using var fixture = new ApiFixture();
        await fixture.InitializeAsync();
        var client = fixture.CreateClient();

        var dataSource = fixture.Services.GetRequiredService<EndpointDataSource>();
        GroupScopeAuthorization.EnsureGroupScopeCoverage(dataSource.Endpoints);

        var createResponse = await client.PostAsJsonAsync("/v1/account-groups", new
        {
            code = $"GRP-{Guid.NewGuid():N}",
            name = "Auth-off test group",
            type = "Customer",
            ownerId = "treasury-ops"
        });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = created.GetProperty("id").GetGuid();

        var readResponse = await client.GetAsync($"/v1/account-groups/{groupId}");

        readResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
    }
}

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.Auth;

/// <summary>
/// DRK-1502 review round 1, finding 1: <c>GroupScopeAuthorization.ApplyGroupScope</c> matched the FIRST
/// declared method on a multi-method route and indexed <c>methods[0]</c> unconditionally when none matched —
/// so a route serving an undeclared method alongside a declared one slipped through as covered, and a
/// verb-less route threw <c>IndexOutOfRangeException</c> instead of the named startup refusal. These two
/// reproduction scenarios sit beside, not inside, <see cref="GroupScopeCoverageTests"/> (frozen at
/// <c>c6b52fceae66e9b2678508895d014eed9771ea35</c>) — same test-only-host pattern, duplicated rather than
/// reusing its private <c>BuildTestHostAsync</c>.
/// </summary>
public sealed class GroupScopeCoverageReworkTests
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
                    services.AddAuthentication();
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
                    services.AddGroupScopeCoverageCheck();
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

    /// <summary>
    /// Reproduces finding 1's first case: a route serving two methods, only one of which the group declared,
    /// must still refuse startup — matching the declared method must not short-circuit coverage of the route.
    /// </summary>
    [Fact]
    public async Task MultiMethodRoute_WithOnlyOneMethodDeclared_StopsTheApiAtStartup()
    {
        var exception = await Should.ThrowAsync<InvalidOperationException>(() => BuildTestHostAsync(routeBuilder =>
        {
            var group = routeBuilder.MapGroup($"/{TestGroupName}").WithDisplayName(TestGroupName);
            group.DeclareGroupScope(ScopeNames.AccountsRead, "GET");
            // DELETE serves this same route alongside the declared GET, and has no declaration, per-route
            // scope or AllowAnonymous of its own.
            group.MapMethods("/{id:guid}", ["GET", "DELETE"], (Guid id) => Results.Ok());
        }));

        exception.Message.ShouldContain(TestGroupName);
        exception.Message.ShouldContain("DELETE");
    }

    /// <summary>
    /// Reproduces finding 1's second case: a verb-less route in a declaring group must refuse startup with
    /// the named-route message, not throw <see cref="IndexOutOfRangeException"/> from inside the check.
    /// </summary>
    [Fact]
    public async Task VerbLessRoute_InADeclaringGroup_StopsTheApiAtStartup()
    {
        var exception = await Should.ThrowAsync<InvalidOperationException>(() => BuildTestHostAsync(routeBuilder =>
        {
            var group = routeBuilder.MapGroup($"/{TestGroupName}").WithDisplayName(TestGroupName);
            group.DeclareGroupScope(ScopeNames.AccountsRead, "GET");
            // No HTTP method restriction at all — serves every verb, none of them declared.
            group.Map("/{id:guid}", (Guid id) => Results.Ok());
        }));

        exception.Message.ShouldContain(TestGroupName);
        exception.Message.ShouldContain("*");
    }

    /// <summary>
    /// Every method a multi-method route serves must be individually declared — not merely one of them — for
    /// startup to succeed, and the applied scope is enforced on the resulting route. Covers the "stamp every
    /// distinct matching scope" branch the fix added (as opposed to <c>methods[0]</c>'s single-scope guess).
    /// </summary>
    [Fact]
    public async Task MultiMethodRoute_WithEveryMethodDeclared_StartsAndEnforcesTheScope()
    {
        using var host = await BuildTestHostAsync(routeBuilder =>
        {
            var group = routeBuilder.MapGroup($"/{TestGroupName}").WithDisplayName(TestGroupName);
            group.DeclareGroupScope(ScopeNames.AccountsRead, "GET", "DELETE");
            group.MapMethods("/{id:guid}", ["GET", "DELETE"], (Guid id) => Results.Ok());
        });

        var client = host.GetTestClient();
        var id = Guid.NewGuid();

        var withoutScope = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/{TestGroupName}/{id}")
        {
            Headers = { { LedgerCallerAuthHandler.ClientIdHeaderName, "caller" } }
        });
        var withScope = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/{TestGroupName}/{id}")
        {
            Headers =
            {
                { LedgerCallerAuthHandler.ClientIdHeaderName, "caller" },
                { LedgerCallerAuthHandler.ScopesHeaderName, ScopeNames.AccountsRead }
            }
        });

        withoutScope.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        withScope.StatusCode.ShouldBe(HttpStatusCode.OK);
    }
}

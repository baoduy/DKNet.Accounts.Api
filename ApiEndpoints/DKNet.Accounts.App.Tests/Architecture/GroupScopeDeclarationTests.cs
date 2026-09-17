using System.Net.Http.Json;
using Microsoft.AspNetCore.Routing;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1498 §5 acceptance criteria for the shipped account-group/account/postings groups: every scenario
/// below drives the real, unmodified <c>AccountGroupsV1Endpoint</c>/<c>AccountsV1Endpoint</c>/
/// <c>PostingsV1Endpoint</c> through <see cref="LedgerApiFixture"/>, and every one of them also calls
/// <see cref="GroupScopeAuthorization.EnsureGroupScopeCoverage"/> against the live
/// <see cref="EndpointDataSource"/> — which throws <see cref="NotImplementedException"/> at this stage (the
/// group-declaration mechanism doesn't exist yet), so every scenario here is red for that one nameable
/// reason, the same way <c>LedgerSteps</c>' stub-era scenarios were (DRK-1250 §7). Build wires
/// <c>AccountGroupsV1Endpoint</c>/<c>AccountsV1Endpoint</c> onto
/// <see cref="GroupScopeAuthorization.DeclareGroupScope"/> (§3 rows 5-6) and turns every one of these green.
/// </summary>
public sealed class GroupScopeDeclarationTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    private HttpClient Client => fixture.CreateClient();

    private static HttpRequestMessage AsCaller(string clientId, IEnumerable<string> scopes, HttpMethod method, string uri, object? body = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, clientId);
        request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', scopes));
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    /// <summary>Every scenario's shared "not-implemented yet" fact — see the class doc comment.</summary>
    private void AssertGroupScopeCoverageMechanismExists()
    {
        var dataSource = fixture.Services.GetRequiredService<EndpointDataSource>();
        GroupScopeAuthorization.EnsureGroupScopeCoverage(dataSource.Endpoints);
    }

    private async Task<Guid> CreateGroupAsync()
    {
        var response = await Client.SendAsync(AsCaller("PayHub", ScopeNames.All, HttpMethod.Post, GroupsPath, new
        {
            code = $"GRP-{Guid.NewGuid():N}",
            name = "Treasury test group",
            type = "Customer",
            ownerId = "PayHub"
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    private async Task<Guid> OpenAccountAsync(Guid groupId)
    {
        var response = await Client.SendAsync(AsCaller("PayHub", ScopeNames.All, HttpMethod.Post, AccountsPath, new
        {
            groupId,
            name = "Treasury test account",
            currency = "SGD",
            classification = "Liability",
            permittedToGoNegative = false
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    /// <summary>Scenario: A read route accepts a caller holding the group's read scope.</summary>
    [Fact]
    public async Task ReadRoute_AcceptsCallerHoldingGroupReadScope()
    {
        AssertGroupScopeCoverageMechanismExists();

        var groupId = await CreateGroupAsync();

        var response = await Client.SendAsync(AsCaller(
            "treasury-ops", [ScopeNames.AccountsRead], HttpMethod.Get, $"{GroupsPath}/{groupId}"));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    /// <summary>Scenario: A write route refuses a caller holding only the read scope.</summary>
    [Fact]
    public async Task WriteRoute_RefusesCallerHoldingOnlyReadScope()
    {
        AssertGroupScopeCoverageMechanismExists();

        var groupId = await CreateGroupAsync();

        var response = await Client.SendAsync(AsCaller(
            "treasury-ops", [ScopeNames.AccountsRead], HttpMethod.Put, $"{GroupsPath}/{groupId}",
            new { name = "Renamed by treasury-ops" }));

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    /// <summary>
    /// Scenario Outline: One declaration shared by several methods covers each of them — Examples: opening,
    /// renaming and closing an account, all under one "accounts.write for POST, PUT and PATCH" declaration.
    /// </summary>
    [Theory]
    [InlineData("opening an account")]
    [InlineData("renaming an account")]
    [InlineData("closing an account")]
    public async Task OneDeclarationSharedBySeveralMethods_CoversEachOfThem(string action)
    {
        AssertGroupScopeCoverageMechanismExists();

        var groupId = await CreateGroupAsync();
        var scopes = new[] { ScopeNames.AccountsWrite };

        HttpResponseMessage response;
        switch (action)
        {
            case "opening an account":
                response = await Client.SendAsync(AsCaller("treasury-ops", scopes, HttpMethod.Post, AccountsPath, new
                {
                    groupId,
                    name = "Opened by treasury-ops",
                    currency = "SGD",
                    classification = "Liability",
                    permittedToGoNegative = false
                }));
                break;

            case "renaming an account":
                var accountToRename = await OpenAccountAsync(groupId);
                response = await Client.SendAsync(AsCaller(
                    "treasury-ops", scopes, HttpMethod.Put, $"{AccountsPath}/{accountToRename}",
                    new { name = "Renamed by treasury-ops" }));
                break;

            case "closing an account":
                var accountToClose = await OpenAccountAsync(groupId);
                response = await Client.SendAsync(AsCaller(
                    "treasury-ops", scopes, HttpMethod.Patch, $"{AccountsPath}/{accountToClose}",
                    new { status = "Closed" }));
                break;

            default:
                throw new ArgumentOutOfRangeException(nameof(action), action, "Unknown example action.");
        }

        response.StatusCode.ShouldBeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    /// <summary>Scenario: A route that declares its own scope keeps it instead of the group's.</summary>
    [Fact]
    public async Task RouteWithOwnScope_KeepsItInsteadOfTheGroups()
    {
        AssertGroupScopeCoverageMechanismExists();

        var groupId = await CreateGroupAsync();
        var accountId = await OpenAccountAsync(groupId);

        // "treasury-ops" holds ONLY postings.read here — the group's own GET declaration is accounts.read, so
        // this only succeeds if the statement route's own RequireScope(PostingsRead) still wins per-route.
        var response = await Client.SendAsync(AsCaller(
            "treasury-ops", [ScopeNames.PostingsRead], HttpMethod.Get, $"{AccountsPath}/{accountId}/statement"));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    /// <summary>Scenario: No shipped route becomes reachable without a token.</summary>
    [Fact]
    public async Task NoShippedRoute_BecomesReachableWithoutAToken()
    {
        AssertGroupScopeCoverageMechanismExists();

        foreach (var (method, path) in ShippedLedgerRoutes())
        {
            var response = await Client.SendAsync(new HttpRequestMessage(method, path));
            response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized, $"{method} {path} should refuse a callerless request");
        }
    }

    /// <summary>Scenario: A group that declares no scopes keeps today's behaviour (the Postings group).</summary>
    [Fact]
    public async Task NonDeclaringGroup_KeepsTodaysBehaviour()
    {
        AssertGroupScopeCoverageMechanismExists();

        var writeOnly = new[] { ScopeNames.PostingsWrite };
        var readOnly = new[] { ScopeNames.PostingsRead };

        var recordResponse = await Client.SendAsync(AsCaller("treasury-ops", readOnly, HttpMethod.Post, PostingsPath, new
        {
            accountId = Guid.NewGuid(),
            direction = "Credit",
            amount = 1.00m,
            currency = "SGD",
            category = "Transfer"
        }));
        recordResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden, "postings.write is still required per-route");

        var readResponse = await Client.SendAsync(AsCaller("treasury-ops", writeOnly, HttpMethod.Get, $"{PostingsPath}/{Guid.NewGuid()}"));
        readResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden, "postings.read is still required per-route");
    }

    /// <summary>The 23 shipped ledger routes (account groups, accounts, postings, currencies), mirroring
    /// <see cref="RouteScopeCoverageTests"/>'s own list, with a concrete id substituted for every route
    /// parameter so each path actually routes.</summary>
    private static IEnumerable<(HttpMethod Method, string Path)> ShippedLedgerRoutes()
    {
        var id = Guid.NewGuid();
        yield return (HttpMethod.Post, "/v1/account-groups/");
        yield return (HttpMethod.Get, "/v1/account-groups/");
        yield return (HttpMethod.Get, $"/v1/account-groups/{id}");
        yield return (HttpMethod.Put, $"/v1/account-groups/{id}");
        yield return (HttpMethod.Put, $"/v1/account-groups/{id}/change-description");
        yield return (HttpMethod.Put, $"/v1/account-groups/{id}/change-metadata");
        yield return (HttpMethod.Post, $"/v1/account-groups/{id}/close");
        yield return (HttpMethod.Post, $"/v1/account-groups/{id}/activate");
        yield return (HttpMethod.Delete, $"/v1/account-groups/{id}");
        yield return (HttpMethod.Get, $"/v1/account-groups/{id}/balances");
        yield return (HttpMethod.Post, "/v1/accounts/");
        yield return (HttpMethod.Get, "/v1/accounts/");
        yield return (HttpMethod.Get, $"/v1/accounts/{id}");
        yield return (HttpMethod.Get, $"/v1/accounts/{id}/balance");
        yield return (HttpMethod.Put, $"/v1/accounts/{id}");
        yield return (HttpMethod.Put, $"/v1/accounts/{id}/change-metadata");
        yield return (HttpMethod.Patch, $"/v1/accounts/{id}");
        yield return (HttpMethod.Get, $"/v1/accounts/{id}/statement");
        yield return (HttpMethod.Get, "/v1/currencies/");
        yield return (HttpMethod.Post, "/v1/postings/");
        yield return (HttpMethod.Post, "/v1/postings/batch");
        yield return (HttpMethod.Get, $"/v1/postings/{id}");
        yield return (HttpMethod.Post, $"/v1/postings/{id}/reverse");
    }
}

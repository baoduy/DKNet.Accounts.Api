using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Share;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// Covers AccountGroups Create/Update handler branches the BDD acceptance scenarios don't reach: successful
/// re-parenting, duplicate group code, get-by-id (found and not-found), and closing a group whose account
/// genuinely holds a balance (set directly on the tracked entity — postings are the next stage, so there is
/// no API path to a non-zero balance yet; see <see cref="Account"/> tests for the entity-level guard).
/// </summary>
public sealed class AccountGroupsHandlerTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string GroupsPath = "/v1/account-groups";

    private HttpClient Client => fixture.CreateClient();

    private static HttpRequestMessage AsPayHub(HttpMethod method, string uri, object? body = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
        request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', ScopeNames.All));
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    private async Task<Guid> CreateGroupAsync(string code, string? parentId = null)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, GroupsPath, new
        {
            code,
            name = code,
            type = "Customer",
            ownerId = "PayHub",
            parentId
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task CreatingAGroupWithADuplicateCode_IsRefused()
    {
        var code = $"DUP-{Guid.NewGuid():N}";
        await CreateGroupAsync(code);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, GroupsPath, new
        {
            code,
            name = "Another name",
            type = "Customer",
            ownerId = "PayHub"
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.DuplicateGroupCode);
    }

    [Fact]
    public async Task ChangingMetadata_RoundTripsKeysVerbatim()
    {
        // Regression: global Mapster NameMatchingStrategy.Flexible re-cased plain dictionary keys as if they
        // were member names ("region" -> "Region") — see the matching Account-level test for the root cause.
        var id = await CreateGroupAsync($"MD-{Guid.NewGuid():N}");

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Patch, $"{GroupsPath}/{id}", new
        {
            metadata = new Dictionary<string, string> { ["region"] = "SG" }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("metadata").GetProperty("region").GetString().ShouldBe("SG");
    }

    [Fact]
    public async Task ReparentingToAnUnrelatedExistingGroup_Succeeds()
    {
        var parentId = await CreateGroupAsync($"PAR-{Guid.NewGuid():N}");
        var childId = await CreateGroupAsync($"CHI-{Guid.NewGuid():N}");

        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Patch, $"{GroupsPath}/{childId}", new { parentId }));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("parentId").GetGuid().ShouldBe(parentId);
    }

    [Fact]
    public async Task GetById_ReturnsTheGroup_WhenItExists()
    {
        var code = $"GET-{Guid.NewGuid():N}";
        var id = await CreateGroupAsync(code);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{GroupsPath}/{id}"));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(code);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenTheGroupDoesNotExist()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{GroupsPath}/{Guid.NewGuid()}"));

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ClosingAGroupWhoseAccountReallyHoldsABalance_IsRefused()
    {
        var groupId = await CreateGroupAsync($"BAL-{Guid.NewGuid():N}");
        var accountResponse = await Client.SendAsync(AsPayHub(HttpMethod.Post, "/v1/accounts", new
        {
            groupId,
            name = "Operating",
            currency = "SGD",
            classification = "Asset",
            permittedToGoNegative = false
        }));
        accountResponse.EnsureSuccessStatusCode();
        var accountId = (await accountResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        // Postings are the next stage — there is no API path to a non-zero balance yet, so the balance is set
        // directly on the tracked entity to prove this handler's guard (which R: refuses closing a group
        // while any account it holds still carries a balance) actually fires when it can be reached.
        using (var scope = fixture.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
            var account = await dbContext.Set<Account>().SingleAsync(a => a.Id == accountId);
            typeof(Account).GetProperty(nameof(Account.Balance))!.SetValue(account, 25.00m);
            await dbContext.SaveChangesAsync();
        }

        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Patch, $"{GroupsPath}/{groupId}", new { status = "Closed" }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.GroupHoldsBalance);
    }
}

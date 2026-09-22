using System.Net.Http.Json;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-1393 §5 — account groups become flat. Every scenario drives the real HTTP contract
/// as "treasury-ops"; row 7's legacy-nesting scenario seeds its parent column directly through
/// <see cref="CoreDbContext"/> (R5), the same <c>factory.CreateScope()</c> seam
/// <see cref="AttributeCrudMigrationSteps"/> already uses for direct reads/backdates — because after Build no
/// API accepts a parent any more, so seeding through the API would stop working the moment this ships.
/// </summary>
[Binding]
public sealed class FlatAccountGroupsSteps(HttpClient client, ScenarioState state, BddApiFactory factory)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    #region Shared helpers

    private async Task<Guid> CreateGroupAsync(string code, object? extra = null)
    {
        state.CallerClientId = "treasury-ops";
        var body = Merge(new { code, name = code, type = "Customer", ownerId = "treasury-ops" }, extra);
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, body);
        state.Response = response;
        var id = (await TryReadIdAsync(response))!.Value;
        state.Values[$"group:{code}"] = id.ToString();
        return id;
    }

    private static object Merge(object body, object? extra)
    {
        if (extra is null)
        {
            return body;
        }

        var merged = new Dictionary<string, object?>();
        foreach (var prop in body.GetType().GetProperties())
        {
            merged[prop.Name] = prop.GetValue(body);
        }

        foreach (var prop in extra.GetType().GetProperties())
        {
            merged[prop.Name] = prop.GetValue(extra);
        }

        return merged;
    }

    private static async Task<Guid?> TryReadIdAsync(HttpResponseMessage response)
    {
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var doc = await response.Content.ReadFromJsonAsync<JsonElement>();
        return doc.TryGetProperty("id", out var idProp) && idProp.TryGetGuid(out var id) ? id : null;
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(text);
    }

    /// <summary>Writes the parent column directly, bypassing the API entirely (R5) — the smallest seam that
    /// lets row 7 seed a nested row the way it existed before this change, since the API itself never accepts
    /// a parent once Build ships.</summary>
    private async Task SetLegacyParentAsync(Guid childId, Guid parentId)
    {
        using var scope = factory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var entityType = db.Model.FindEntityType(typeof(AccountGroup))!;
        var table = $"\"{entityType.GetSchema() ?? "public"}\".\"{entityType.GetTableName()}\"";
        await db.Database.ExecuteSqlRawAsync(
            $"UPDATE {table} SET \"ParentId\" = {{0}} WHERE \"Id\" = {{1}}", parentId, childId);
    }

    #endregion

    #region Given

    [Given(@"the account group ""([^""]+)"" exists")]
    public async Task GivenTheAccountGroupExists(string code) => await CreateGroupAsync(code);

    [Given(@"the account groups ""([^""]+)"" and ""([^""]+)"" exist")]
    public async Task GivenTheAccountGroupsExist(string code1, string code2)
    {
        await CreateGroupAsync(code1);
        await CreateGroupAsync(code2);
    }

    [Given(@"the account group ""([^""]+)"" holds no account")]
    public async Task GivenTheAccountGroupHoldsNoAccount(string code) => await CreateGroupAsync(code);

    [Given(@"the accounts service holds ""([^""]+)"" under ""([^""]+)"" from before this change")]
    public async Task GivenTheAccountsServiceHoldsUnderFromBeforeThisChange(string childCode, string parentCode)
    {
        var parentId = await CreateGroupAsync(parentCode);
        var childId = await CreateGroupAsync(childCode);
        await SetLegacyParentAsync(childId, parentId);
    }

    [Given(@"""([^""]+)"" holds an account with a balance of ([\d.]+) (\w+)")]
    public async Task GivenHoldsAnAccountWithABalanceOf(string groupCode, decimal amount, string currency)
    {
        state.CallerClientId = "treasury-ops";
        var groupId = Guid.Parse(state.Values[$"group:{groupCode}"]);
        var accountResponse = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId,
            name = groupCode,
            currency,
            classification = "Liability"
        });
        var accountId = (await TryReadIdAsync(accountResponse))!.Value;
        state.Values[$"account:{groupCode}"] = accountId.ToString();

        if (amount > 0)
        {
            await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
            {
                accountId,
                direction = "Credit",
                amount,
                currency,
                category = "Transfer"
            });
        }
    }

    [Given(@"this change has been released")]
    public void GivenThisChangeHasBeenReleased()
    {
        // No-op: the Given above already seeded the legacy nested row directly through the data layer (R5);
        // nothing changes state at release time.
    }

    #endregion

    #region When

    [When(@"treasury-ops creates the account group ""([^""]+)""$")]
    public async Task WhenTreasuryOpsCreatesTheAccountGroup(string code) => await CreateGroupAsync(code);

    [When(@"treasury-ops creates the account group ""([^""]+)"" and names ""([^""]+)"" as its parent")]
    public async Task WhenTreasuryOpsCreatesTheAccountGroupAndNamesAsItsParent(string code, string parentCode)
    {
        var parentId = Guid.Parse(state.Values[$"group:{parentCode}"]);
        await CreateGroupAsync(code, extra: new { parentId });
    }

    /// <summary>
    /// Exercises the update route rather than the removed status-only PATCH (DRK-1418 §5: that
    /// route no longer exists) — <c>UpdateAccountGroupRequest</c> has no <c>parentId</c> property
    /// either, so the extra field is ignored the same way <see cref="CreateGroupAsync"/>'s own
    /// <c>extra: new { parentId }</c> already proves it is on create.
    /// </summary>
    [When(@"treasury-ops changes ""([^""]+)"" and names ""([^""]+)"" as its parent")]
    public async Task WhenTreasuryOpsChangesAndNamesAsItsParent(string code, string parentCode)
    {
        state.CallerClientId = "treasury-ops";
        var id = state.Values[$"group:{code}"];
        var parentId = state.Values[$"group:{parentCode}"];
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Put, $"{GroupsPath}/{id}",
            new { description = "Reparented?", parentId });
    }

    // Two literal bindings, not one with a `(filtered by|sorted by)` alternation — Reqnroll tries Cucumber
    // Expression syntax first, where a parenthesised group means OPTIONAL text, not regex alternation, so
    // "(filtered by|sorted by)" parses as the single optional literal "filtered by|sorted by" and never
    // matches either real sentence at all ("no matching step definition").
    [When(@"treasury-ops lists account groups filtered by parent")]
    public async Task WhenTreasuryOpsListsAccountGroupsFilteredByParent()
    {
        state.CallerClientId = "treasury-ops";
        var query = Uri.EscapeDataString($"ParentId:Equal:{Guid.NewGuid()}");
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}?filter={query}");
    }

    [When(@"treasury-ops lists account groups sorted by parent")]
    public async Task WhenTreasuryOpsListsAccountGroupsSortedByParent()
    {
        state.CallerClientId = "treasury-ops";
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}?orderBy=ParentId");
    }

    [When(@"treasury-ops reads ""([^""]+)""")]
    public async Task WhenTreasuryOpsReads(string code)
    {
        state.CallerClientId = "treasury-ops";
        var id = state.Values[$"group:{code}"];
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{id}");
    }

    [When(@"treasury-ops closes ""([^""]+)""")]
    public async Task WhenTreasuryOpsCloses(string code)
    {
        state.CallerClientId = "treasury-ops";
        var id = state.Values[$"group:{code}"];
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{GroupsPath}/{id}/close");
    }

    #endregion

    #region Then

    [Then(@"""([^""]+)"" carries no parent")]
    public async Task ThenCarriesNoParent(string code)
    {
        var id = state.Values[$"group:{code}"];
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{id}"));
        doc.TryGetProperty("parentId", out _).ShouldBeFalse();
    }

    [Then(@"the request is refused with status 400")]
    public void ThenTheRequestIsRefusedWithStatus400() =>
        ((int)state.Response!.StatusCode).ShouldBe(400);

    [Then(@"the request is refused with status 422 and the code ""([^""]+)""")]
    public async Task ThenTheRequestIsRefusedWithStatus422AndTheCode(string code)
    {
        ((int)state.Response!.StatusCode).ShouldBe(422);
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == code)
            .ShouldBeTrue($"expected an error carrying code {code}, got: {doc}");
    }

    [Then(@"""([^""]+)"" still holds that account with a balance of ([\d.]+) (\w+), and keeps its code, name and status")]
    public async Task ThenStillHoldsThatAccountAndKeepsItsFields(string groupCode, decimal amount, string currency)
    {
        var accountId = state.Values[$"account:{groupCode}"];
        var balanceDoc = await ReadJsonAsync(
            await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{accountId}/balance"));
        balanceDoc.GetProperty("balance").GetDecimal().ShouldBe(amount);
        balanceDoc.GetProperty("currency").GetString().ShouldBe(currency);

        var groupId = state.Values[$"group:{groupCode}"];
        var groupDoc = await ReadJsonAsync(
            await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{groupId}"));
        groupDoc.GetProperty("code").GetString().ShouldBe(groupCode);
        groupDoc.GetProperty("name").GetString().ShouldBe(groupCode);
        groupDoc.GetProperty("status").GetString().ShouldBe("active");
    }

    [Then(@"the request succeeds and ""([^""]+)"" is closed")]
    public async Task ThenTheRequestSucceedsAndIsClosed(string code)
    {
        state.Response!.IsSuccessStatusCode.ShouldBeTrue(
            $"expected success, got {(int)state.Response!.StatusCode}");
        var id = state.Values[$"group:{code}"];
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{id}"));
        doc.GetProperty("status").GetString().ShouldBe("closed");
    }

    #endregion
}

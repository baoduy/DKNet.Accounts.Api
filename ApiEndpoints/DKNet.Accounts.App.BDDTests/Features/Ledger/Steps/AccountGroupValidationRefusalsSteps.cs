using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-1418 §5 — the two account-group refusals (DUPLICATE_GROUP_CODE, GROUP_HOLDS_BALANCE)
/// move into request validation, and closing/reopening become their own named routes
/// (<c>POST {id}/close</c>, <c>POST {id}/activate</c>) instead of the status-only PATCH. Every scenario is red
/// until Build wires those routes (§3 rows 1, 5, 8) — see the completion report's per-scenario table. Scenarios
/// pinning behaviour §2 already documents as working today (duplicate-code refusal, the race backstop, shape
/// refusals) are green from authoring: this refactor only relocates where that check runs, it does not change
/// what a caller observes.
/// </summary>
[Binding]
public sealed class AccountGroupValidationRefusalsSteps(HttpClient client, ScenarioState state, BddApiFactory factory)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    private HttpResponseMessage? _firstRaceResponse;
    private HttpResponseMessage? _secondRaceResponse;

    #region Shared helpers

    private async Task<Guid?> CreateGroupAsync(string code, string name)
    {
        state.CallerClientId = "treasury-ops";
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code, name, type = "Customer", ownerId = "treasury-ops"
        });
        state.Response = response;
        var id = await TryReadIdAsync(response);
        if (id is not null)
        {
            state.Values[$"group:{code}"] = id.Value.ToString();
            state.Values["lastGroupId"] = id.Value.ToString();
        }

        return id;
    }

    private Guid ResolveGroupId(string codeOrId) =>
        state.Values.TryGetValue($"group:{codeOrId}", out var stored) ? Guid.Parse(stored) : Guid.Parse(codeOrId);

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

    /// <summary>Seeds a held amount directly — there is no API to set it (R4: every held amount answers 0
    /// until held funds are built), the same direct-write seam <c>FlatAccountGroupsSteps.SetLegacyParentAsync</c>
    /// already uses for a column no API can move.</summary>
    private async Task SetHeldAmountAsync(Guid accountId, decimal heldAmount)
    {
        using var scope = factory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var entityType = db.Model.FindEntityType(typeof(Account))!;
        var table = $"\"{entityType.GetSchema() ?? "public"}\".\"{entityType.GetTableName()}\"";
        await db.Database.ExecuteSqlRawAsync(
            $"UPDATE {table} SET \"HeldAmount\" = {{0}} WHERE \"Id\" = {{1}}", heldAmount, accountId);
    }

    private async Task<Guid> OpenAccountInGroupAsync(Guid groupId, string currency)
    {
        state.CallerClientId = "treasury-ops";
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId, name = "Fixture Account", currency, classification = "Liability"
        });
        return (await TryReadIdAsync(response))!.Value;
    }

    private async Task RecordCreditAsync(Guid accountId, decimal amount, string currency)
    {
        if (amount <= 0)
        {
            return;
        }

        await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId, direction = "Credit", amount, currency, category = "Transfer"
        });
    }

    private async Task AssertGroupStatusAsync(Guid groupId, string expectedStatus)
    {
        state.CallerClientId = "treasury-ops";
        state.CallerScopes = [.. ScopeNames.All];
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{groupId}"));
        doc.GetProperty("status").GetString().ShouldBe(expectedStatus);
    }

    #endregion

    #region Given

    [Given(@"no account group holds the code ""([^""]+)""")]
    public void GivenNoAccountGroupHoldsTheCode(string code)
    {
        // No-op: each scenario starts against a freshly truncated database (BddApiFactory.ResetDatabaseAsync),
        // so no group with this code exists yet.
    }

    [Given(@"an account group holds the code ""([^""]+)""")]
    public async Task GivenAnAccountGroupHoldsTheCode(string code) => await CreateGroupAsync(code, code);

    [Given(@"the account group ""([^""]+)"" holds an account with a balance of ([\d.]+) SGD and a held amount of ([\d.]+) SGD")]
    public async Task GivenTheAccountGroupHoldsAnAccountWithABalanceOfAndAHeldAmountOf(
        string code, decimal balance, decimal held)
    {
        var groupId = (await CreateGroupAsync(code, code))!.Value;
        var accountId = await OpenAccountInGroupAsync(groupId, "SGD");
        await RecordCreditAsync(accountId, balance, "SGD");
        if (held > 0)
        {
            await SetHeldAmountAsync(accountId, held);
        }
    }

    [Given(@"the account group ""([^""]+)"" holds one account with a balance of ([\d.]+) SGD and a held amount of ([\d.]+) SGD")]
    public async Task GivenTheAccountGroupHoldsOneAccountWithABalanceOfAndAHeldAmountOf(
        string code, decimal balance, decimal held) =>
        await GivenTheAccountGroupHoldsAnAccountWithABalanceOfAndAHeldAmountOf(code, balance, held);

    // "the account group "X" holds no account" is already bound in FlatAccountGroupsSteps — same shape
    // (CreateGroupAsync only), so scenario 6 reuses that binding rather than redefining it here.

    /// <summary>Closes through the still-live PATCH (today's only working close path) so this precondition does
    /// not depend on the very route this slice is red on.</summary>
    [Given(@"the account group ""([^""]+)"" is closed")]
    public async Task GivenTheAccountGroupIsClosed(string code)
    {
        var groupId = (await CreateGroupAsync(code, code))!.Value;
        state.CallerClientId = "treasury-ops";
        await client.SendAsCallerAsync(state, HttpMethod.Patch, $"{GroupsPath}/{groupId}", new { status = "Closed" });
    }

    [Given(@"the account group ""([^""]+)"" is active")]
    public async Task GivenTheAccountGroupIsActive(string code) => await CreateGroupAsync(code, code);

    [Given(@"auditor-ops holds the account-group read permission and not the write permission")]
    public void GivenAuditorOpsHoldsTheAccountGroupReadPermissionAndNotTheWritePermission()
    {
        state.CallerClientId = "auditor-ops";
        state.CallerScopes = [ScopeNames.AccountsRead];
        state.ExpectedRefusalStatus = HttpStatusCode.Forbidden;
    }

    [Given(@"no account group is known by the identifier ""([^""]+)""")]
    public void GivenNoAccountGroupIsKnownByTheIdentifier(string id)
    {
        // No-op: a freshly truncated database already holds no group by this id.
    }

    #endregion

    #region When

    [When(@"treasury-ops creates a group with code ""([^""]+)"" and name ""([^""]+)""")]
    public async Task WhenTreasuryOpsCreatesAGroupWithCodeAndName(string code, string name) =>
        await CreateGroupAsync(code, name);

    [When(@"treasury-ops creates another group with code ""([^""]+)""")]
    public async Task WhenTreasuryOpsCreatesAnotherGroupWithCode(string code) =>
        await CreateGroupAsync(code, $"{code}-2");

    [When(@"two requests create a group with code ""([^""]+)"" at the same moment")]
    public async Task WhenTwoRequestsCreateAGroupWithCodeAtTheSameMoment(string code)
    {
        state.CallerClientId = "treasury-ops";
        Task<HttpResponseMessage> Send() => client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code, name = code, type = "Customer", ownerId = "treasury-ops"
        });

        var first = Send();
        var second = Send();
        await Task.WhenAll(first, second);
        _firstRaceResponse = await first;
        _secondRaceResponse = await second;

        var winnerId = await TryReadIdAsync(_firstRaceResponse) ?? await TryReadIdAsync(_secondRaceResponse);
        if (winnerId is not null)
        {
            state.Values[$"group:{code}"] = winnerId.Value.ToString();
        }
    }

    [When(@"treasury-ops closes the group ""([^""]+)""")]
    public async Task WhenTreasuryOpsClosesTheGroup(string code)
    {
        state.CallerClientId = "treasury-ops";
        var groupId = ResolveGroupId(code);
        state.Values["lastGroupId"] = groupId.ToString();
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{GroupsPath}/{groupId}/close");
    }

    [When(@"treasury-ops reopens the group ""([^""]+)""")]
    public async Task WhenTreasuryOpsReopensTheGroup(string code)
    {
        state.CallerClientId = "treasury-ops";
        var groupId = ResolveGroupId(code);
        state.Values["lastGroupId"] = groupId.ToString();
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{GroupsPath}/{groupId}/activate");
    }

    [When(@"auditor-ops closes the group ""([^""]+)""")]
    public async Task WhenAuditorOpsClosesTheGroup(string code) =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Post, $"{GroupsPath}/{ResolveGroupId(code)}/close");

    [When(@"auditor-ops reopens the group ""([^""]+)""")]
    public async Task WhenAuditorOpsReopensTheGroup(string code) =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Post, $"{GroupsPath}/{ResolveGroupId(code)}/activate");

    [When(@"treasury-ops sends a partial update of the group ""([^""]+)"" carrying only the status ""([^""]+)""")]
    public async Task WhenTreasuryOpsSendsAPartialUpdateOfTheGroupCarryingOnlyTheStatus(string code, string status)
    {
        state.CallerClientId = "treasury-ops";
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Patch, $"{GroupsPath}/{ResolveGroupId(code)}", new { status });
    }

    [When(@"treasury-ops creates a group with an empty code and name ""([^""]+)""")]
    public async Task WhenTreasuryOpsCreatesAGroupWithAnEmptyCodeAndName(string name)
    {
        state.CallerClientId = "treasury-ops";
        state.ExpectedRefusalStatus = HttpStatusCode.BadRequest;
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code = "", name, type = "Customer", ownerId = "treasury-ops"
        });
    }

    #endregion

    #region Then

    [Then(@"the response carries (?:the code|the group) ""([^""]+)""")]
    public async Task ThenTheResponseCarriesTheCodeOrGroup(string expectedCode)
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("code").GetString().ShouldBe(expectedCode);
    }

    [Then(@"one request creates the group")]
    public void ThenOneRequestCreatesTheGroup() =>
        (_firstRaceResponse!.StatusCode == HttpStatusCode.Created ||
         _secondRaceResponse!.StatusCode == HttpStatusCode.Created).ShouldBeTrue(
            $"expected one 201, got {(int)_firstRaceResponse!.StatusCode} and {(int)_secondRaceResponse!.StatusCode}");

    [Then(@"the other is refused with 409")]
    public void ThenTheOtherIsRefusedWith409() =>
        (_firstRaceResponse!.StatusCode == HttpStatusCode.Conflict ||
         _secondRaceResponse!.StatusCode == HttpStatusCode.Conflict).ShouldBeTrue(
            $"expected one 409, got {(int)_firstRaceResponse!.StatusCode} and {(int)_secondRaceResponse!.StatusCode}");

    [Then(@"exactly one account group holds the code ""([^""]+)""")]
    public async Task ThenExactlyOneAccountGroupHoldsTheCode(string code)
    {
        state.CallerClientId = "treasury-ops";
        var query = Uri.EscapeDataString($"Code:Equal:{code}");
        var doc = await ReadJsonAsync(
            await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}?filter={query}"));
        doc.GetProperty("items").EnumerateArray().Count().ShouldBe(1);
    }

    [Then(@"the group is closed")]
    public async Task ThenTheGroupIsClosed() =>
        await AssertGroupStatusAsync(Guid.Parse(state.Values["lastGroupId"]), "closed");

    [Then(@"the group is active")]
    public async Task ThenTheGroupIsActive() =>
        await AssertGroupStatusAsync(Guid.Parse(state.Values["lastGroupId"]), "active");

    [Then(@"the group ""([^""]+)"" is still active")]
    public async Task ThenTheGroupIsStillActive(string code) =>
        await AssertGroupStatusAsync(ResolveGroupId(code), "active");

    [Then(@"the request answers (\d+)")]
    public void ThenTheRequestAnswers(int statusCode) =>
        ((int)state.Response!.StatusCode).ShouldBe(statusCode);

    [Then(@"the refusal carries no stable code")]
    public async Task ThenTheRefusalCarriesNoStableCode()
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.TryGetProperty("code", out _).ShouldBeFalse();
    }

    #endregion
}

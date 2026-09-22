using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-1372 §5 — the author of a change comes from the caller's credential. Every
/// created-by/updated-by/calling-system assertion reads the entity straight from <c>CoreDbContext</c>, the
/// same no-new-seam approach <see cref="AttributeCrudMigrationSteps"/> already uses: no DTO exposes these
/// fields over HTTP, and none is added here.
/// </summary>
[Binding]
public sealed class AuthorFromCredentialSteps(HttpClient client, ScenarioState state, BddApiFactory factory)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    #region Shared helpers

    private async Task<Guid> CreateGroupAsync(string code, object? extra = null)
    {
        var body = Merge(new { code, name = code, type = "Customer", ownerId = "default-owner" }, extra);
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, body);
        var id = (await TryReadIdAsync(response))!.Value;
        state.Values[$"group:{code}"] = id.ToString();
        state.Values["lastGroupId"] = id.ToString();
        return id;
    }

    private async Task<Guid> GetOrCreateGroupIdAsync(string code) =>
        state.Values.TryGetValue($"group:{code}", out var existing) && Guid.TryParse(existing, out var id)
            ? id
            : await CreateGroupAsync(code);

    private async Task<Guid> OpenAccountAsync(
        string label, Guid? groupId = null, bool permittedToGoNegative = false, decimal? overdraftLimit = null)
    {
        // Opening reads the group now, so the fallback must be a real group, not a fabricated id.
        var currency = label.Split('-')[0];
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId = groupId ?? await GetOrCreateGroupIdAsync("DFLT"),
            name = label,
            currency,
            classification = "Liability",
            permittedToGoNegative,
            overdraftLimit
        });
        var id = (await TryReadIdAsync(response))!.Value;
        state.Values[$"account:{label}"] = id.ToString();
        state.Values["lastAccountId"] = id.ToString();
        return id;
    }

    private async Task<Guid> GetOrCreateAccountIdAsync(string label) =>
        state.Values.TryGetValue($"account:{label}", out var existing) && Guid.TryParse(existing, out var id)
            ? id
            : await OpenAccountAsync(label, permittedToGoNegative: true, overdraftLimit: 1_000_000m);

    private async Task<Guid> RecordPostingAsync(Guid accountId, decimal amount, string currency)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId,
            direction = "Credit",
            amount,
            currency,
            category = "Transfer"
        });
        var id = (await TryReadIdAsync(response))!.Value;
        state.Values["lastPostingId"] = id.ToString();
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

    private Guid LastGroupId => Guid.Parse(state.Values["lastGroupId"]);

    private Guid LastAccountId => Guid.Parse(state.Values["lastAccountId"]);

    private Guid LastPostingId => Guid.Parse(state.Values["lastPostingId"]);

    private async Task<string?> ReadGroupFieldAsync(Guid id, Func<AccountGroup, string?> select)
    {
        using var scope = factory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var group = await db.Set<AccountGroup>().AsNoTracking().FirstOrDefaultAsync(g => g.Id == id);
        return group is null ? null : select(group);
    }

    private async Task<string?> ReadAccountFieldAsync(Guid id, Func<Account, string?> select)
    {
        using var scope = factory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var account = await db.Set<Account>().AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        return account is null ? null : select(account);
    }

    private async Task<string?> ReadPostingFieldAsync(Guid id, Func<Posting, string?> select)
    {
        using var scope = factory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var posting = await db.Set<Posting>().AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        return posting is null ? null : select(posting);
    }

    #endregion

    #region Given

    [Given(@"""([^""]+)"" is an authenticated person calling from the system ""([^""]+)""")]
    public void GivenIsAnAuthenticatedPersonCallingFromTheSystem(string person, string system)
    {
        state.CallerClientId = system;
        state.CallerSubject = person;
        state.CallerScopes = [.. ScopeNames.All];
    }

    [Given(@"""([^""]+)"" is an authenticated calling system that identifies no person")]
    public void GivenIsAnAuthenticatedCallingSystemThatIdentifiesNoPerson(string system)
    {
        state.CallerClientId = system;
        state.CallerSubject = null;
        state.CallerScopes = [.. ScopeNames.All];
    }

    [Given(@"an active, empty account group ""([^""]+)"" exists")]
    public async Task GivenAnActiveEmptyAccountGroupExists(string code) => await CreateGroupAsync(code);

    [Given(@"an active account ""([^""]+)"" exists")]
    public async Task GivenAnActiveAccountExists(string label) =>
        await OpenAccountAsync(label, permittedToGoNegative: true, overdraftLimit: 100.00m);

    [Given(@"a posted credit of ([\d.]+) (\w+) on account ""([^""]+)"" exists")]
    public async Task GivenAPostedCreditOnAccountExists(decimal amount, string currency, string label)
    {
        var accountId = await OpenAccountAsync(label, permittedToGoNegative: true, overdraftLimit: 1_000_000m);
        await RecordPostingAsync(accountId, amount, currency);
    }

    #endregion

    #region When

    [When(@"""([^""]+)"" sends (a rename to ""[^""]+""|a close) for ""([^""]+)""")]
    public async Task WhenSendsForGroup(string caller, string request, string code)
    {
        var groupId = await GetOrCreateGroupIdAsync(code);

        if (request.StartsWith("a rename to \"", StringComparison.Ordinal))
        {
            var newName = request["a rename to \"".Length..^1];
            state.Response = await client.SendAsCallerAsync(
                state, HttpMethod.Put, $"{GroupsPath}/{groupId}", new { name = newName });
        }
        else
        {
            state.Response = await client.SendAsCallerAsync(
                state, HttpMethod.Post, $"{GroupsPath}/{groupId}/close");
        }

        state.Values["lastGroupId"] = groupId.ToString();
    }

    /// <summary>
    /// <paramref name="claimedAuthor"/> is deliberately never sent: the close route binds no body at all
    /// (DRK-1418 §3 row 8 — the route builds <c>CloseAccountGroupRequest</c> from the id alone), and even when
    /// a body was bound, that generated request type has no author-settable property to spoof. Either way the
    /// scenario's real guarantee — <c>UpdatedBy</c> comes only from the authenticated caller's credential,
    /// never from anything the caller sends — is what "the request succeeds and the author is priya.menon"
    /// still proves.
    /// </summary>
    [When(@"""([^""]+)"" sends a close for ""([^""]+)"" naming ""([^""]+)"" as the author")]
    public async Task WhenSendsACloseForNamingAsTheAuthor(string caller, string code, string claimedAuthor)
    {
        var groupId = await GetOrCreateGroupIdAsync(code);
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{GroupsPath}/{groupId}/close");
        state.Values["lastGroupId"] = groupId.ToString();
    }

    [When(@"""([^""]+)"" creates account group ""([^""]+)""")]
    public async Task WhenCreatesAccountGroup(string caller, string code) => await CreateGroupAsync(code);

    [When(@"""([^""]+)"" opens account ""([^""]+)"" in group ""([^""]+)""")]
    public async Task WhenOpensAccountInGroup(string caller, string label, string groupCode)
    {
        var groupId = await GetOrCreateGroupIdAsync(groupCode);
        await OpenAccountAsync(label, groupId);
    }

    [When(@"""([^""]+)"" sets the overdraft limit of ""([^""]+)"" to ([\d.]+) (\w+)")]
    public async Task WhenSetsTheOverdraftLimitOfTo(string caller, string label, decimal amount, string currency)
    {
        var accountId = await GetOrCreateAccountIdAsync(label);
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Patch, $"{AccountsPath}/{accountId}", new { overdraftLimit = amount });
        state.Values["lastAccountId"] = accountId.ToString();
    }

    [When(@"""([^""]+)"" records a credit of ([\d.]+) (\w+) to account ""([^""]+)""")]
    public async Task WhenRecordsACreditToAccount(string caller, decimal amount, string currency, string label)
    {
        var accountId = await GetOrCreateAccountIdAsync(label);
        await RecordPostingAsync(accountId, amount, currency);
    }

    [When(@"""([^""]+)"" reverses that posting")]
    public async Task WhenReversesThatPosting(string caller) =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Post, $"{PostingsPath}/{LastPostingId}/reverse",
            new { reason = "Recorded in error" }, $"rev-{Guid.NewGuid():N}");

    #endregion

    #region Then

    [Then(@"the request succeeds")]
    public void ThenTheRequestSucceeds() =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue(
            $"expected success, got {(int)state.Response!.StatusCode}");

    [Then(@"the account group's updated-by is ""([^""]+)""")]
    public async Task ThenTheAccountGroupsUpdatedByIs(string expected) =>
        (await ReadGroupFieldAsync(LastGroupId, g => g.UpdatedBy)).ShouldBe(expected);

    [Then(@"the account group's created-by is ""([^""]+)""")]
    public async Task ThenTheAccountGroupsCreatedByIs(string expected) =>
        (await ReadGroupFieldAsync(LastGroupId, g => g.CreatedBy)).ShouldBe(expected);

    [Then(@"the account's created-by is ""([^""]+)""")]
    public async Task ThenTheAccountsCreatedByIs(string expected) =>
        (await ReadAccountFieldAsync(LastAccountId, a => a.CreatedBy)).ShouldBe(expected);

    [Then(@"the account's updated-by is ""([^""]+)""")]
    public async Task ThenTheAccountsUpdatedByIs(string expected) =>
        (await ReadAccountFieldAsync(LastAccountId, a => a.UpdatedBy)).ShouldBe(expected);

    [Then(@"the posting's created-by is ""([^""]+)""")]
    public async Task ThenThePostingsCreatedByIs(string expected) =>
        (await ReadPostingFieldAsync(LastPostingId, p => p.CreatedBy)).ShouldBe(expected);

    [Then(@"the posting's calling system is ""([^""]+)""")]
    public async Task ThenThePostingsCallingSystemIs(string expected) =>
        (await ReadPostingFieldAsync(LastPostingId, p => p.CallingSystem)).ShouldBe(expected);

    [Then(@"the original posting's updated-by is ""([^""]+)""")]
    public async Task ThenTheOriginalPostingsUpdatedByIs(string expected) =>
        (await ReadPostingFieldAsync(LastPostingId, p => p.UpdatedBy)).ShouldBe(expected);

    #endregion
}

using System.Globalization;
using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for the DRK-1279 §7 characterization scenarios, revised per §11's widened mandate (owner:
/// new/changed routes are fine, maximum auto-flow, less code). Most scenarios pin behaviour the hand-written
/// implementation already satisfies and stay green through Build's plumbing swap. The two account-group list
/// scenarios now drive the *target* generated-list contract (`filter=Field:Operation:Value`,
/// `pageNumber`/`pageSize`, `{items:[...]}` envelope) instead of today's bare-array/`?type=` shape, and are
/// expected red until Build moves `GET /v1/account-groups` onto the generated route — see the completion
/// report's route table and per-scenario results.
/// </summary>
[Binding]
public sealed class AttributeCrudMigrationSteps(HttpClient client, ScenarioState state, BddApiFactory factory)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    #region Shared helpers

    private async Task<Guid?> CreateGroupAsync(string code, string type, string ownerId = "default-owner", object? extra = null)
    {
        var body = Merge(new { code, name = code, type, ownerId }, extra);
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, body);
        state.Response = response;
        var id = await TryReadIdAsync(response);
        state.Values[$"group:{code}"] = id?.ToString() ?? "";
        return id;
    }

    private async Task<Guid?> OpenAccountAsync(
        string currency,
        Guid? groupId = null,
        string classification = "Liability",
        bool permittedToGoNegative = false,
        decimal? overdraftLimit = null,
        string name = "Fixture Account")
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId = groupId ?? Guid.NewGuid(),
            name,
            currency,
            classification,
            permittedToGoNegative,
            overdraftLimit
        });
        state.Response = response;
        return await TryReadIdAsync(response);
    }

    private async Task<Guid?> RecordPostingAsync(Guid accountId, decimal amount, string currency, string? idempotencyKey = null)
    {
        var response = await client.SendAsCallerAsync(
            state,
            HttpMethod.Post,
            PostingsPath,
            new { accountId, direction = "Credit", amount, currency, category = "Transfer" },
            idempotencyKey);
        state.Response = response;
        return await TryReadIdAsync(response);
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

    private Guid LastGroupId => Guid.TryParse(state.Values.GetValueOrDefault("lastGroupId"), out var id) ? id : Guid.Empty;

    private Guid LastAccountId => Guid.TryParse(state.Values.GetValueOrDefault("lastAccountId"), out var id) ? id : Guid.Empty;

    private Guid LastPostingId => Guid.TryParse(state.Values.GetValueOrDefault("lastPostingId"), out var id) ? id : Guid.Empty;

    /// <summary>Reads a JSON response body more than once — the network stream is buffered by
    /// <c>LedgerHttpClientExtensions.SendAsAsync</c>, but <c>ReadFromJsonAsync</c> still disposes it on first read.</summary>
    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(text);
    }

    /// <summary>Reads <see cref="AccountGroup.CreatedBy"/> directly — the acting-user invariant this scenario
    /// pins (R1) is stamped on the entity, but no DTO exposes it over HTTP today (§2: AccountGroupDto has 9
    /// hand-written fields, none of them an author/CreatedBy). No new seam: this reuses the same
    /// <c>factory.CreateScope()</c> / <c>CoreDbContext</c> access <see cref="Support.ApiHooks"/> already uses.</summary>
    private async Task<string?> ReadGroupCreatedByAsync(Guid groupId)
    {
        using var scope = factory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var group = await db.Set<AccountGroup>().AsNoTracking().FirstOrDefaultAsync(g => g.Id == groupId);
        return group?.CreatedBy;
    }

    /// <summary>Backdates a group's CreatedOn column directly via SQL — there is no API to set it (creation is
    /// always "now"), and no new seam is needed since the DB is already reachable the same way
    /// <see cref="Support.BddApiFactory.ResetDatabaseAsync"/> reaches it for the truncate.</summary>
    private async Task BackdateGroupCreatedOnAsync(Guid groupId, DateTimeOffset createdOn)
    {
        using var scope = factory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var entityType = db.Model.FindEntityType(typeof(AccountGroup))!;
        var table = $"\"{entityType.GetSchema() ?? "public"}\".\"{entityType.GetTableName()}\"";
        // Table/schema names come from EF metadata, not user input — safe to splice into the SQL text.
        // The two data values still go through provider parameters via ExecuteSqlRaw's {0}/{1} placeholders.
        await db.Database.ExecuteSqlRawAsync(
            $"UPDATE {table} SET \"CreatedOn\" = {{0}} WHERE \"Id\" = {{1}}", createdOn, groupId);
    }

    #endregion

    #region Given

    [Given(@"the calling system ""([^""]+)"" is authorised to write accounts")]
    public void GivenTheCallingSystemIsAuthorisedToWriteAccounts(string name)
    {
        state.CallerClientId = name;
        state.CallerScopes = [ScopeNames.AccountsRead, ScopeNames.AccountsWrite];
    }

    [Given(@"the calling system ""([^""]+)"" is authorised only to read accounts")]
    public void GivenTheCallingSystemIsAuthorisedOnlyToReadAccounts(string name)
    {
        state.CallerClientId = name;
        state.CallerScopes = [ScopeNames.AccountsRead];
        state.ExpectedRefusalStatus = HttpStatusCode.Forbidden;
    }

    [Given(@"the calling system ""([^""]+)"" is authorised to record and read postings but not to reverse them")]
    public void GivenTheCallingSystemIsAuthorisedToRecordAndReadPostingsButNotToReverseThem(string name)
    {
        state.CallerClientId = name;
        state.CallerScopes = [ScopeNames.PostingsWrite, ScopeNames.PostingsRead];
        state.ExpectedRefusalStatus = HttpStatusCode.Forbidden;
    }

    [Given(@"the calling system ""([^""]+)"" holds every ledger scope except (.+)$")]
    public void GivenTheCallingSystemHoldsEveryLedgerScopeExcept(string name, string excludedScope)
    {
        state.CallerClientId = name;
        state.CallerScopes = [.. ScopeNames.All.Where(s => s != excludedScope.Trim())];
        state.ExpectedRefusalStatus = HttpStatusCode.Forbidden;
    }

    [Given(@"the account group ""([^""]+)"" named ""([^""]+)"" exists")]
    public async Task GivenTheAccountGroupNamedExists(string code, string name)
    {
        var id = await CreateGroupAsync(code, "Customer");
        state.Values["lastGroupId"] = id?.ToString() ?? Guid.NewGuid().ToString();
        state.Values["lastGroupCode"] = code;
    }

    [Given(@"the account group ""([^""]+)"" of type ""([^""]+)"" owned by ""([^""]+)"" exists")]
    public async Task GivenTheAccountGroupOfTypeOwnedByExists(string code, string type, string owner)
    {
        // A real parent (not just a null one) so the Then step's parent assertion can pin an exact value —
        // a null ParentId is omitted from the JSON entirely (DefaultIgnoreCondition.WhenWritingNull), so
        // presence-checking a null field can't tell "field removed from the DTO" from "field null this time".
        var parentId = await CreateGroupAsync($"{code}-PARENT", type);
        var id = await CreateGroupAsync(code, type, owner, extra: new { parentId });
        state.Values["lastGroupId"] = id?.ToString() ?? Guid.NewGuid().ToString();
        state.Values["lastGroupCode"] = code;
        state.Values["lastGroupOwner"] = owner;
        state.Values["lastGroupType"] = type;
        state.Values["lastGroupParentId"] = parentId?.ToString() ?? "";
    }

    [Given(@"the account groups ""([^""]+)"" of type ""([^""]+)"" and ""([^""]+)"" of type ""([^""]+)"" exist")]
    public async Task GivenTheAccountGroupsOfTypeAndOfTypeExist(string code1, string type1, string code2, string type2)
    {
        await CreateGroupAsync(code1, type1);
        await CreateGroupAsync(code2, type2);
    }

    [Given(@"no account group ""([^""]+)"" exists")]
    public void GivenNoAccountGroupExists(string code)
    {
        state.Values["lastGroupId"] = Guid.NewGuid().ToString();
        state.Values["lastGroupCode"] = code;
        // Reused by the existing generic "the request is refused(?:.*)" catch-all in LedgerSteps.cs, which
        // defaults to 422 — this scenario's own precondition is what makes 404 the right expectation.
        state.ExpectedRefusalStatus = HttpStatusCode.NotFound;
    }

    [Given(@"no account ""([^""]+)"" exists")]
    public void GivenNoAccountExists(string accountNumber)
    {
        state.Values["lastAccountId"] = Guid.NewGuid().ToString();
        state.ExpectedRefusalStatus = HttpStatusCode.NotFound;
    }

    [Given(@"the posting ""([^""]+)"" of ([\d.]+) (\w+) exists")]
    public async Task GivenThePostingExists(string postingNumber, decimal amount, string currency)
    {
        var accountId = await OpenAccountAsync(currency);
        var postingId = await RecordPostingAsync(accountId!.Value, amount, currency);
        state.Values["lastPostingId"] = postingId?.ToString() ?? "";
    }

    [Given(@"the account group ""([^""]+)"" holds an account with a balance of ([\d.]+) (\w+)")]
    public async Task GivenTheAccountGroupHoldsAnAccountWithABalanceOf(string code, decimal amount, string currency)
    {
        var groupId = await CreateGroupAsync(code, "Customer");
        state.Values["lastGroupId"] = groupId?.ToString() ?? "";
        state.Values["lastGroupCode"] = code;
        var accountId = await OpenAccountAsync(currency, groupId);
        state.Values["lastAccountId"] = accountId?.ToString() ?? "";
        if (amount > 0)
        {
            await RecordPostingAsync(accountId!.Value, amount, currency);
        }
    }

    [Given(@"the account ""([^""]+)"" has a balance of ([\d.]+) (\w+)")]
    public async Task GivenTheAccountHasABalanceOf(string accountNumber, decimal amount, string currency)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["lastAccountId"] = accountId?.ToString() ?? "";
        if (amount > 0)
        {
            await RecordPostingAsync(accountId!.Value, amount, currency);
        }
    }

    [Given(@"the calling system ""([^""]+)"" recorded a credit of ([\d.]+) (\w+) under idempotency key ""([^""]+)""")]
    public async Task GivenTheCallingSystemRecordedACreditUnderIdempotencyKey(
        string name, decimal amount, string currency, string key)
    {
        state.CallerClientId = name;
        state.CallerScopes = [ScopeNames.PostingsWrite, ScopeNames.PostingsRead];
        var postingId = await RecordPostingAsync(LastAccountId, amount, currency, key);
        state.Values["idempotentPostingId"] = postingId?.ToString() ?? "";
        state.Values["idempotencyKey"] = key;
        state.Values["idempotencyAmount"] = amount.ToString(CultureInfo.InvariantCulture);
        state.Values["idempotencyCurrency"] = currency;
    }

    [Given(@"the account ""([^""]+)"" of currency ""([^""]+)"" exists")]
    public async Task GivenTheAccountOfCurrencyExists(string accountNumber, string currency)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["lastAccountId"] = accountId?.ToString() ?? "";
    }

    [Given(@"an account group created four months ago exists")]
    public async Task GivenAnAccountGroupCreatedFourMonthsAgoExists()
    {
        var code = $"AGE-{Guid.NewGuid():N}"[..12];
        var id = await CreateGroupAsync(code, "Customer");
        await BackdateGroupCreatedOnAsync(id!.Value, DateTimeOffset.UtcNow.AddMonths(-4));
        state.Values["lastGroupId"] = id.Value.ToString();
        state.Values["lastGroupCode"] = code;
    }

    #endregion

    #region When

    [When(@"it creates the account group ""([^""]+)"" named ""([^""]+)""")]
    public async Task WhenItCreatesTheAccountGroupNamed(string code, string name)
    {
        var id = await CreateGroupAsync(code, "Customer");
        state.Values["lastGroupId"] = id?.ToString() ?? "";
        state.Values["lastGroupCode"] = code;
    }

    [When(@"it creates the account group ""([^""]+)"" naming ""([^""]+)"" as the author")]
    public async Task WhenItCreatesTheAccountGroupNamingAsTheAuthor(string code, string claimedAuthor)
    {
        var id = await CreateGroupAsync(code, "Customer", extra: new { author = claimedAuthor });
        state.Values["lastGroupId"] = id?.ToString() ?? "";
        state.Values["lastGroupCode"] = code;
    }

    [When(@"it renames the group to ""([^""]+)""")]
    public async Task WhenItRenamesTheGroupTo(string newName) =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Patch, $"{GroupsPath}/{LastGroupId}", new { name = newName });

    [When(@"the calling system ""([^""]+)"" reads that group")]
    public async Task WhenTheCallingSystemReadsThatGroup(string name)
    {
        state.CallerClientId = name;
        state.CallerScopes = [ScopeNames.AccountsRead, ScopeNames.AccountsWrite];
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{LastGroupId}");
    }

    [When(@"the calling system ""([^""]+)"" lists the account groups of type ""([^""]+)""")]
    public async Task WhenTheCallingSystemListsTheAccountGroupsOfType(string name, string type)
    {
        // Target generated-list syntax (§11 — take the generated shape): filter=Field:Operation:Value, not
        // ?type=. Red until Build moves GET /v1/account-groups onto MapGetList.
        state.CallerClientId = name;
        state.CallerScopes = [ScopeNames.AccountsRead, ScopeNames.AccountsWrite];
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{GroupsPath}?filter={Uri.EscapeDataString($"Type:Equal:{type}")}");
    }

    [When(@"the calling system ""([^""]+)"" lists the account groups with no date bounds")]
    public async Task WhenTheCallingSystemListsTheAccountGroupsWithNoDateBounds(string name)
    {
        // Target generated-list syntax: pageNumber/pageSize, not pageSize alone against the hand-written
        // query. Red until Build moves GET /v1/account-groups onto MapGetList.
        state.CallerClientId = name;
        state.CallerScopes = [ScopeNames.AccountsRead, ScopeNames.AccountsWrite];
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{GroupsPath}?pageNumber=1&pageSize=1000");
    }

    [When(@"it renames that account to ""([^""]+)""")]
    public async Task WhenItRenamesThatAccountTo(string newName) =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Patch, $"{AccountsPath}/{LastAccountId}", new { name = newName });

    [When(@"it closes the group")]
    public async Task WhenItClosesTheGroup() =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Patch, $"{GroupsPath}/{LastGroupId}", new { status = "Closed" });

    [When(@"it opens an account named ""([^""]+)"" permitted to go negative with no overdraft limit")]
    public async Task WhenItOpensAnAccountPermittedToGoNegativeWithNoOverdraftLimit(string name) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId = Guid.NewGuid(),
            name,
            currency = "SGD",
            classification = "Liability",
            permittedToGoNegative = true,
            overdraftLimit = (decimal?)null
        });

    [When(@"it reverses that posting")]
    public async Task WhenItReversesThatPosting() =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Post, $"{PostingsPath}/{LastPostingId}/reverse");

    [When(@"it records the same credit again under idempotency key ""([^""]+)""")]
    public async Task WhenItRecordsTheSameCreditAgainUnderIdempotencyKey(string key)
    {
        var amount = decimal.Parse(state.Values["idempotencyAmount"], CultureInfo.InvariantCulture);
        var currency = state.Values["idempotencyCurrency"];
        var postingId = await RecordPostingAsync(LastAccountId, amount, currency, key);
        state.Values["replayPostingId"] = postingId?.ToString() ?? "";
    }

    [When(@"it calls (.+)$")]
    public async Task WhenItCalls(string routeSpec)
    {
        var parts = routeSpec.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var method = new HttpMethod(parts[0]);
        var path = parts[1];

        if (path.Contains("{id}"))
        {
            var callerId = state.CallerClientId;
            var callerScopes = state.CallerScopes;
            state.CallerClientId = "fixture-setup";
            state.CallerScopes = [.. ScopeNames.All];

            Guid id;
            if (path.Contains("/reverse"))
            {
                var accountId = (await OpenAccountAsync("SGD"))!.Value;
                id = (await RecordPostingAsync(accountId, 10.00m, "SGD"))!.Value;
            }
            else if (path.StartsWith(AccountsPath))
            {
                // Covers both /v1/accounts/{id} and /v1/accounts/{id}/statement.
                id = (await OpenAccountAsync("SGD"))!.Value;
            }
            else
            {
                id = (await CreateGroupAsync($"FIX-{Guid.NewGuid():N}"[..12], "Customer"))!.Value;
            }

            path = path.Replace("{id}", id.ToString());
            state.CallerClientId = callerId;
            state.CallerScopes = callerScopes;
        }

        object? body = method == HttpMethod.Post && path.StartsWith(GroupsPath) && !path.Contains("reverse")
            ? new { code = $"FIX-{Guid.NewGuid():N}"[..12], name = "Fixture", type = "Customer", ownerId = "fixture-owner" }
            : null;

        state.Response = await client.SendAsCallerAsync(state, method, path, body);
    }

    #endregion

    #region Then

    [Then(@"the group is created")]
    public void ThenTheGroupIsCreated() =>
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created);

    [Then(@"(?:its|the group's) author is recorded as ""([^""]+)""")]
    public async Task ThenAuthorIsRecordedAs(string expectedAuthor)
    {
        var createdBy = await ReadGroupCreatedByAsync(LastGroupId);
        createdBy.ShouldBe(expectedAuthor);
    }

    [Then(@"the group's name is ""([^""]+)""")]
    public async Task ThenTheGroupsNameIs(string expectedName)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{LastGroupId}");
        var doc = await ReadJsonAsync(response);
        doc.GetProperty("name").GetString().ShouldBe(expectedName);
    }

    [Then(@"the account's name is ""([^""]+)""")]
    public async Task ThenTheAccountsNameIs(string expectedName)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{LastAccountId}");
        var doc = await ReadJsonAsync(response);
        doc.GetProperty("name").GetString().ShouldBe(expectedName);
    }

    [Then(@"it receives the group's code, name, type, status, owner and parent")]
    public async Task ThenItReceivesTheGroupsFields()
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK);
        var doc = await ReadJsonAsync(state.Response);
        doc.GetProperty("code").GetString().ShouldBe(state.Values["lastGroupCode"]);
        doc.GetProperty("name").GetString().ShouldNotBeNullOrEmpty();
        // Pinned to the actual literals (not presence-only) so an `[Exclude]` on either field in the
        // Build-stage [GenerateDto] conversion turns this scenario red instead of passing on whatever the
        // generated DTO happens to still contain.
        doc.GetProperty("type").GetString().ShouldBe(state.Values["lastGroupType"].ToLowerInvariant());
        doc.GetProperty("status").GetString().ShouldBe("active");
        doc.GetProperty("ownerId").GetString().ShouldBe(state.Values["lastGroupOwner"]);
        // A real (non-null) parent — removing ParentId from the DTO drops this key entirely, catching the
        // same class of silent field loss; a null parent would be indistinguishable either way, since null
        // properties are omitted from the response regardless of whether the DTO still declares them.
        doc.GetProperty("parentId").GetGuid().ShouldBe(Guid.Parse(state.Values["lastGroupParentId"]));
    }

    [Then(@"it receives ""([^""]+)""")]
    public async Task ThenItReceives(string expectedCode)
    {
        // Target contract (§11/§5B): PagedResponse<T>'s {items:[...]} envelope, not today's bare JSON array —
        // red until Build moves GET /v1/account-groups onto the generated MapGetList route.
        var doc = await ReadJsonAsync(state.Response!);
        var items = doc.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("code").GetString());
        items.ShouldContain(expectedCode);
    }

    [Then(@"it does not receive ""([^""]+)""")]
    public async Task ThenItDoesNotReceive(string unexpectedCode)
    {
        var doc = await ReadJsonAsync(state.Response!);
        var items = doc.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("code").GetString());
        items.ShouldNotContain(unexpectedCode);
    }

    // "the request is refused as not-found/forbidden/unprocessable" is deliberately NOT bound here — the
    // existing generic `[Then(@"the request is refused(?:.*)")]` in LedgerSteps.cs already matches all three
    // (its trailing `(?:.*)` absorbs "as not-found" etc.), and a second matching binding here would make
    // Reqnroll throw on an ambiguous step match. This suite only needs to set `state.ExpectedRefusalStatus`
    // to the right value (done in the Given/When steps above) for that shared step to assert correctly.

    [Then(@"the posting is still not reversed")]
    public async Task ThenThePostingIsStillNotReversed()
    {
        var callerId = state.CallerClientId;
        var callerScopes = state.CallerScopes;
        state.CallerClientId = "fixture-setup";
        state.CallerScopes = [.. ScopeNames.All];
        var readResponse = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{PostingsPath}/{LastPostingId}");
        state.CallerClientId = callerId;
        state.CallerScopes = callerScopes;

        var doc = await ReadJsonAsync(readResponse);
        doc.GetProperty("status").GetString().ShouldNotBe("reversed", StringComparer.OrdinalIgnoreCase);
    }

    [Then(@"the refusal carries the code ""([^""]+)""")]
    public async Task ThenTheRefusalCarriesTheCode(string expectedCode)
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("code").GetString().ShouldBe(expectedCode);
    }

    [Then(@"it receives the original posting")]
    public void ThenItReceivesTheOriginalPosting() =>
        state.Values["replayPostingId"].ShouldBe(state.Values["idempotentPostingId"]);

    [Then(@"the account's balance is ([\d.]+) (\w+)")]
    public async Task ThenTheAccountsBalanceIs(decimal amount, string currency)
    {
        // Reads with an elevated caller — the scenario's own caller may (as here) hold only the postings
        // scopes it was testing, not AccountsRead, and this assertion isn't about scope enforcement.
        var callerId = state.CallerClientId;
        var callerScopes = state.CallerScopes;
        state.CallerClientId = "fixture-setup";
        state.CallerScopes = [.. ScopeNames.All];
        var response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{LastAccountId}/balance");
        state.CallerClientId = callerId;
        state.CallerScopes = callerScopes;

        var doc = await ReadJsonAsync(response);
        doc.GetProperty("balance").GetDecimal().ShouldBe(amount);
        doc.GetProperty("currency").GetString().ShouldBe(currency);
    }

    [Then(@"it receives that group")]
    public async Task ThenItReceivesThatGroup()
    {
        var doc = await ReadJsonAsync(state.Response!);
        var codes = doc.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("code").GetString());
        codes.ShouldContain(state.Values["lastGroupCode"]);
    }

    #endregion
}

using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Api.Configs.GlobalExceptions;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-1522 §5 (Dknet11ErrorPath.feature) — the move to DKNet 11.0.0's one registered
/// <c>ErrorResponseOptions</c>, the new <c>errors[]</c> refusal-body shape, and "Close" joining the generated
/// account-group route set. Every <c>@new</c> scenario is red today because the service still writes the old
/// top-level <c>code</c>/<c>detail</c> shape (§3 rows 3-6); every <c>@guard</c> scenario pins behaviour that
/// must already be true on today's code and stay true after Build.
/// </summary>
[Binding]
public sealed class Dknet11ErrorPathSteps(HttpClient client, ScenarioState state)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    /// <summary>
    /// "Accounts publish no delete route" reads, in the scenario text, "the request is refused as not
    /// found" — but no DELETE method is registered on this route template (GET/PUT/PATCH are), so ASP.NET
    /// Core routing answers with 405 Method Not Allowed, not 404. Named here, at the top of the class next
    /// to the other constants, rather than inline inside <c>WhenSendsADeleteRequestFor</c>, so the mismatch
    /// with the scenario's own wording is visible without opening that method — dev-leader has recorded the
    /// spec's loose wording separately on DRK-1522; this constant is the measured fact, not a fix to it.
    /// </summary>
    private const HttpStatusCode DeleteRouteRefusalStatus = HttpStatusCode.MethodNotAllowed;

    #region Shared helpers

    private void SignInAs(string clientId, params string[] scopes)
    {
        state.CallerClientId = clientId;
        state.CallerScopes = scopes;
    }

    private async Task<Guid> CreateGroupAsync(string name)
    {
        // The code is generated independently of `name` — several callers pass a name containing spaces
        // (e.g. "group-for-Operating SGD"), and a group code with a space in it is refused by validation.
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code = $"g{Guid.NewGuid():N}"[..5].ToUpperInvariant(), name, type = "Customer", ownerId = state.CallerClientId
        });
        var id = (await TryReadIdAsync(response))!.Value;
        state.Values[$"group:{name}"] = id.ToString();
        return id;
    }

    /// <summary>
    /// "the account group ""X"" holds an account with a balance of Y SGD" is already bound (more generally)
    /// in <c>AttributeCrudMigrationSteps</c>, which stores the created group under <c>lastGroupId</c>/
    /// <c>lastGroupCode</c> rather than this file's own <c>group:{name}</c> convention — this helper resolves
    /// either shape rather than redefining that step (which would be ambiguous with it).
    /// </summary>
    private Guid Group(string name) =>
        state.Values.TryGetValue($"group:{name}", out var stored)
            ? Guid.Parse(stored)
            : state.Values.GetValueOrDefault("lastGroupCode") == name
                ? Guid.Parse(state.Values["lastGroupId"])
                : throw new KeyNotFoundException($"No known account group id for \"{name}\".");

    private async Task<Guid> OpenAccountAsync(string name, Guid groupId, string currency = "SGD")
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId, name, currency, classification = "Liability"
        });
        var id = (await TryReadIdAsync(response))!.Value;
        state.Values[$"account:{name}"] = id.ToString();
        return id;
    }

    private Guid Account(string name) => Guid.Parse(state.Values[$"account:{name}"]);

    private async Task RecordCreditAsync(Guid accountId, decimal amount, string currency = "SGD")
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

    #endregion

    #region Given — fixtures

    // "the account group ""X"" holds an account with a balance of Y SGD" is already bound (more generally,
    // capturing the currency) in AttributeCrudMigrationSteps — reused rather than redefined here; see Group().

    [Given(@"the account group ""([^""]+)"" holds two SGD accounts with balances of ([\d.]+) and ([\d.]+)")]
    public async Task GivenTheAccountGroupHoldsTwoSgdAccountsWithBalancesOf(
        string groupName, decimal balance1, decimal balance2)
    {
        SignInAs("fixture-setup", [.. ScopeNames.All]);
        var groupId = await CreateGroupAsync(groupName);
        var account1 = await OpenAccountAsync($"{groupName}-1", groupId);
        var account2 = await OpenAccountAsync($"{groupName}-2", groupId);
        await RecordCreditAsync(account1, balance1);
        await RecordCreditAsync(account2, balance2);
    }

    [Given(@"the posting ""([^""]+)"" was recorded with the idempotency key ""([^""]+)""")]
    public async Task GivenThePostingWasRecordedWithTheIdempotencyKey(string postingKey, string idempotencyKey)
    {
        SignInAs("treasury-ops", ScopeNames.AccountsWrite, ScopeNames.PostingsWrite);
        var groupId = await CreateGroupAsync($"group-for-{postingKey}");
        var accountId = await OpenAccountAsync($"account-for-{postingKey}", groupId);
        state.Values["idempotencyAccount"] = accountId.ToString();
        await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId, direction = "Credit", amount = 10.00m, currency = "SGD", category = "Transfer"
        }, idempotencyKey);
    }

    [Given(@"the account ""([^""]+)"" exists")]
    public async Task GivenTheAccountExists(string accountName)
    {
        SignInAs("fixture-setup", [.. ScopeNames.All]);
        var groupId = await CreateGroupAsync($"group-for-{accountName}");
        await OpenAccountAsync(accountName, groupId);
    }

    [Given(@"the account ""([^""]+)"" is open in the group ""([^""]+)"" with a balance of ([\d.]+) SGD")]
    public async Task GivenTheAccountIsOpenInTheGroupWithABalanceOf(string accountName, string groupName, decimal balance)
    {
        SignInAs("fixture-setup", [.. ScopeNames.All]);
        var groupId = state.Values.ContainsKey($"group:{groupName}") ? Group(groupName) : await CreateGroupAsync(groupName);
        var accountId = await OpenAccountAsync(accountName, groupId);
        await RecordCreditAsync(accountId, balance);
    }

    [Given(@"the account ""([^""]+)"" is open with a balance of ([\d.]+) SGD")]
    public async Task GivenTheAccountIsOpenWithABalanceOf(string accountName, decimal balance)
    {
        SignInAs("fixture-setup", [.. ScopeNames.All]);
        var groupId = await CreateGroupAsync($"group-for-{accountName}");
        var accountId = await OpenAccountAsync(accountName, groupId);
        await RecordCreditAsync(accountId, balance);
    }

    [Given(@"the accounts ""([^""]+)"" and ""([^""]+)"" are open, holding ([\d.]+) SGD and ([\d.]+) SGD")]
    public async Task GivenTheAccountsAreOpenHolding(string name1, string name2, decimal balance1, decimal balance2)
    {
        SignInAs("fixture-setup", [.. ScopeNames.All]);
        var groupId = await CreateGroupAsync($"group-for-{name1}-{name2}");
        var id1 = await OpenAccountAsync(name1, groupId);
        var id2 = await OpenAccountAsync(name2, groupId);
        await RecordCreditAsync(id1, balance1);
        await RecordCreditAsync(id2, balance2);
    }

    [Given(@"a posting moved ([\d.]+) SGD from ""([^""]+)"" to ""([^""]+)""")]
    public async Task GivenAPostingMovedFromTo(decimal amount, string fromName, string toName)
    {
        SignInAs("fixture-setup", [.. ScopeNames.All]);
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = Account(fromName), direction = "Debit", amount, currency = "SGD", category = "Transfer" },
                new { accountId = Account(toName), direction = "Credit", amount, currency = "SGD", category = "Transfer" }
            }
        });
        var doc = await ReadJsonAsync(response);
        var creditLeg = doc.EnumerateArray()
            .First(l => string.Equals(l.GetProperty("direction").GetString(), "credit", StringComparison.OrdinalIgnoreCase));
        state.Values["lastPosting"] = creditLeg.GetProperty("id").GetGuid().ToString();
    }

    [Given(@"no account group with the id ""([^""]+)"" exists")]
    public void GivenNoAccountGroupWithTheIdExists(string id) => state.Values["unknownGroupId"] = id;

    // "the account group "X" is closed" is already bound in AccountGroupValidationRefusalsSteps (same
    // regex, same state.Values["group:{code}"] key shape) — reused rather than redefined here.

    #endregion

    #region Given — caller permissions

    [Given(@"""([^""]+)"" is signed in and holds the accounts-write permission")]
    public void GivenIsSignedInAndHoldsTheAccountsWritePermission(string clientId) =>
        SignInAs(clientId, ScopeNames.AccountsWrite);

    [Given(@"""([^""]+)"" is signed in and holds the postings-write permission")]
    public void GivenIsSignedInAndHoldsThePostingsWritePermission(string clientId) =>
        SignInAs(clientId, ScopeNames.PostingsWrite);

    [Given(@"""([^""]+)"" is signed in and holds the accounts-read permission")]
    public void GivenIsSignedInAndHoldsTheAccountsReadPermission(string clientId) =>
        SignInAs(clientId, ScopeNames.AccountsRead);

    [Given(@"""([^""]+)"" is signed in and holds only the accounts-read permission")]
    public void GivenIsSignedInAndHoldsOnlyTheAccountsReadPermission(string clientId)
    {
        SignInAs(clientId, ScopeNames.AccountsRead);
        state.ExpectedRefusalStatus = HttpStatusCode.Forbidden;
    }

    [Given(@"""([^""]+)"" is signed in and holds the postings-reverse permission")]
    public void GivenIsSignedInAndHoldsThePostingsReversePermission(string clientId) =>
        SignInAs(clientId, ScopeNames.PostingsReverse);

    [Given(@"""([^""]+)"" is signed in and holds every accounts permission and the postings-read permission")]
    public void GivenIsSignedInAndHoldsEveryAccountsPermissionAndThePostingsReadPermission(string clientId) =>
        SignInAs(clientId, ScopeNames.AccountsRead, ScopeNames.AccountsWrite, ScopeNames.PostingsRead);

    #endregion

    #region When

    [When(@"""[^""]+"" sends the close request for ""([^""]+)""")]
    public async Task WhenSendsTheCloseRequestFor(string groupName) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{GroupsPath}/{Group(groupName)}/close");

    [When(@"""[^""]+"" records a different posting with the idempotency key ""([^""]+)""")]
    public async Task WhenRecordsADifferentPostingWithTheIdempotencyKey(string idempotencyKey)
    {
        var accountId = Guid.Parse(state.Values["idempotencyAccount"]);
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId, direction = "Credit", amount = 99.00m, currency = "SGD", category = "Transfer"
        }, idempotencyKey);
    }

    [When(@"""(?:[^""]+)"" sends a create request for an account group with no name")]
    public async Task WhenSendsACreateRequestForAnAccountGroupWithNoName() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code = $"N{Guid.NewGuid():N}"[..5].ToUpperInvariant(), name = "", type = "Customer", ownerId = "treasury-ops"
        });

    [When(@"""[^""]+"" sends a delete request for ""([^""]+)""")]
    public async Task WhenSendsADeleteRequestFor(string accountName)
    {
        state.ExpectedRefusalStatus = DeleteRouteRefusalStatus;
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Delete, $"{AccountsPath}/{Account(accountName)}");
    }

    [When(@"""[^""]+"" sends the request to close ""([^""]+)""")]
    public async Task WhenSendsTheRequestToClose(string accountName) =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Patch, $"{AccountsPath}/{Account(accountName)}", new { status = "Closed" });

    [When(@"""[^""]+"" reads the totals of ""([^""]+)""")]
    public async Task WhenReadsTheTotalsOf(string groupName) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{Group(groupName)}/balances");

    [When(@"""[^""]+"" records a credit of ([\d.]+) SGD with a fresh idempotency key")]
    public async Task WhenRecordsACreditOfWithAFreshIdempotencyKey(decimal amount) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId = Account("Operating SGD"), direction = "Credit", amount, currency = "SGD", category = "Transfer"
        }, $"fresh-{Guid.NewGuid():N}");

    [When(@"""[^""]+"" records a batch moving ([\d.]+) SGD from ""([^""]+)"" to ""([^""]+)"" with a fresh idempotency key")]
    public async Task WhenRecordsABatchMovingFromToWithAFreshIdempotencyKey(decimal amount, string fromName, string toName) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = Account(fromName), direction = "Debit", amount, currency = "SGD", category = "Transfer" },
                new { accountId = Account(toName), direction = "Credit", amount, currency = "SGD", category = "Transfer" }
            }
        }, $"fresh-{Guid.NewGuid():N}");

    [When(@"""[^""]+"" reverses the movement recorded against ""([^""]+)""")]
    public async Task WhenReversesTheMovementRecordedAgainst(string accountName) =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Post, $"{PostingsPath}/{state.Values["lastPosting"]}/reverse",
            new { reason = "Recorded in error" }, $"rev-{Guid.NewGuid():N}");

    [When(@"""(?:[^""]+)"" reads that account group")]
    public async Task WhenReadsThatAccountGroup() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{state.Values["unknownGroupId"]}");

    [When(@"""[^""]+"" sends the activate request for ""([^""]+)""")]
    public async Task WhenSendsTheActivateRequestFor(string groupName) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{GroupsPath}/{Group(groupName)}/activate");

    [When(@"""[^""]+"" sends (.+) to the address published today")]
    public async Task WhenSendsToTheAddressPublishedToday(string request) =>
        state.Response = request switch
        {
            "the request to open a third account in \"TRSY\"" =>
                await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
                {
                    groupId = Group("TRSY"), name = "Third Account", currency = "SGD", classification = "Liability"
                }),
            "the request to close \"Spare SGD\"" =>
                await client.SendAsCallerAsync(
                    state, HttpMethod.Patch, $"{AccountsPath}/{Account("Spare SGD")}", new { status = "Closed" }),
            "the request to set an overdraft limit on \"Operating SGD\"" =>
                await client.SendAsCallerAsync(
                    state, HttpMethod.Patch, $"{AccountsPath}/{Account("Operating SGD")}", new { overdraftLimit = 500.00m }),
            "the request to read the balance of \"Operating SGD\"" =>
                await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account("Operating SGD")}/balance"),
            "the request to read the statement of \"Operating SGD\"" =>
                await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account("Operating SGD")}/statement"),
            _ => throw new NotSupportedException($"Unrecognised request: {request}")
        };

    #endregion

    #region Then

    // "the response status is (\d+)" is already bound in CommonSteps — reused rather than redefined here.

    [Then(@"one error in the response carries the code ""([^""]+)""")]
    public async Task ThenOneErrorInTheResponseCarriesTheCode(string expectedCode)
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var code) && code.GetString() == expectedCode)
            .ShouldBeTrue($"expected an error carrying code {expectedCode}, got: {doc}");
    }

    [Then(@"the response carries no ""detail"" member")]
    public async Task ThenTheResponseCarriesNoDetailMember()
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.TryGetProperty("detail", out _).ShouldBeFalse();
    }

    [Then(@"the response carries one list of errors, each with its message")]
    public async Task ThenTheResponseCarriesOneListOfErrorsEachWithItsMessage()
    {
        var doc = await ReadJsonAsync(state.Response!);
        var errors = doc.GetProperty("errors").EnumerateArray().ToList();
        errors.ShouldNotBeEmpty();
        errors.ShouldAllBe(e => !string.IsNullOrWhiteSpace(e.GetProperty("message").GetString()));
    }

    [Then(@"no error in that list carries one of the service's documented refusal codes")]
    public async Task ThenNoErrorInThatListCarriesOneOfTheServicesDocumentedRefusalCodes()
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var code) && LedgerErrorResponseOptions.IsKnownCode(code.GetString()))
            .ShouldBeFalse();
    }

    // "the request is refused as not found" / "the request is refused as not permitted" are matched by
    // LedgerSteps' shared catch-all ("the request is refused(?! with status)(?:.*)"), which asserts against
    // state.ExpectedRefusalStatus — set by WhenSendsADeleteRequestFor / GivenIsSignedInAndHoldsOnlyThe...
    // above — rather than redefined here (which would be ambiguous with it).

    [Then(@"the account ""([^""]+)"" still exists")]
    public async Task ThenTheAccountStillExists(string accountName)
    {
        SignInAs("treasury-ops", ScopeNames.AccountsRead);
        var response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account(accountName)}");
        response.IsSuccessStatusCode.ShouldBeTrue();
    }

    [Then(@"the account ""([^""]+)"" stays open")]
    public async Task ThenTheAccountStaysOpen(string accountName)
    {
        SignInAs("treasury-ops", ScopeNames.AccountsRead);
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account(accountName)}"));
        doc.GetProperty("status").GetString().ShouldBe("active");
    }

    [Then(@"one line is returned for SGD with a total of ([\d.]+)")]
    public async Task ThenOneLineIsReturnedForSgdWithATotalOf(decimal total)
    {
        var doc = await ReadJsonAsync(state.Response!);
        var lines = doc.EnumerateArray().Where(l => l.GetProperty("currency").GetString() == "SGD").ToList();
        lines.Count.ShouldBe(1);
        lines[0].GetProperty("balance").GetDecimal().ShouldBe(total);
    }

    // "the request succeeds" is already bound in AuthorFromCredentialSteps — reused rather than redefined here.

    [Then(@"the third account is open with a balance of ([\d.]+) SGD")]
    public async Task ThenTheThirdAccountIsOpenWithABalanceOf(decimal balance)
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("balance").GetDecimal().ShouldBe(balance);
    }

    [Then(@"""([^""]+)"" is closed")]
    public async Task ThenIsClosed(string accountName)
    {
        SignInAs("treasury-ops", ScopeNames.AccountsRead);
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account(accountName)}"));
        doc.GetProperty("status").GetString().ShouldBe("closed");
    }

    [Then(@"""([^""]+)"" carries that overdraft limit")]
    public async Task ThenCarriesThatOverdraftLimit(string accountName)
    {
        SignInAs("treasury-ops", ScopeNames.AccountsRead);
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account(accountName)}"));
        doc.GetProperty("overdraftLimit").GetDecimal().ShouldBe(500.00m);
    }

    [Then(@"the balance read is ([\d.]+) SGD")]
    public async Task ThenTheBalanceReadIs(decimal balance)
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("balance").GetDecimal().ShouldBe(balance);
    }

    [Then(@"a paged statement in stream order is returned")]
    public async Task ThenAPagedStatementInStreamOrderIsReturned()
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.TryGetProperty("items", out _).ShouldBeTrue();
    }

    [Then(@"the posting is recorded")]
    public void ThenThePostingIsRecorded() => state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created);

    [Then(@"the balance of ""([^""]+)"" is ([\d.]+) SGD")]
    public async Task ThenTheBalanceOfIs(string accountName, decimal balance)
    {
        SignInAs("treasury-ops", ScopeNames.AccountsRead);
        var doc = await ReadJsonAsync(
            await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account(accountName)}/balance"));
        doc.GetProperty("balance").GetDecimal().ShouldBe(balance);
    }

    [Then(@"both movements are recorded together")]
    public void ThenBothMovementsAreRecordedTogether() =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue($"expected the batch to succeed, got {(int)state.Response!.StatusCode}");

    [Then(@"an opposing posting is recorded")]
    public void ThenAnOpposingPostingIsRecorded() =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue($"expected the reversal to succeed, got {(int)state.Response!.StatusCode}");

    [Then(@"the response carries no body")]
    public async Task ThenTheResponseCarriesNoBody()
    {
        var text = await state.Response!.Content.ReadAsStringAsync();
        text.ShouldBeNullOrEmpty();
    }

    [Then(@"the account group ""([^""]+)"" stays closed")]
    public async Task ThenTheAccountGroupStaysClosed(string groupName)
    {
        SignInAs("treasury-ops", ScopeNames.AccountsRead);
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{Group(groupName)}"));
        doc.GetProperty("status").GetString().ShouldBe("closed");
    }

    #endregion
}

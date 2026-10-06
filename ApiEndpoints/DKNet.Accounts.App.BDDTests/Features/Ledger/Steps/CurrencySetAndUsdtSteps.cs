using System.Globalization;
using System.Net.Http.Json;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-1719 §5 (CurrencySetAndUsdt.feature). Every step drives the HTTP contract.
/// Scoped to this feature: several of its sentences ("the account balance is ...", "the request is refused
/// with ...") are also matched by older, looser bindings in <see cref="LedgerSteps"/>, and a scoped binding wins
/// over an unscoped one, so this feature always gets the stricter check without changing the older scenarios.
/// Every expected value is a literal from the scenario text; amounts are parsed with their scale intact
/// (10.50 stays 10.50), so the request body carries the amount exactly as the scenario writes it.
/// </summary>
[Binding]
[Scope(Feature = "A broader currency set and USDT in the Accounts service")]
public sealed class CurrencySetAndUsdtSteps(HttpClient client, ScenarioState state, BddApiFactory factory)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";
    private const string CurrenciesPath = "/v1/currencies";

    private ScratchDatabaseApiFactory? _scratch;

    /// <summary>The host a step talks to: the scenario's own database when it asked for one, else the shared one.</summary>
    private HttpClient Api => _scratch?.Client ?? client;

    [AfterScenario]
    public async Task DisposeScratchDatabaseAsync()
    {
        if (_scratch is not null)
        {
            await _scratch.DisposeAsync();
        }
    }

    #region Helpers

    private static decimal Amount(string text) =>
        decimal.Parse(text, NumberStyles.Number, CultureInfo.InvariantCulture);

    private Task<HttpResponseMessage> SendAsync(HttpMethod method, string uri, object? body = null, string? key = null) =>
        Api.SendAsCallerAsync(state, method, uri, body, key);

    private static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

    private static async Task ShouldSucceedAsync(HttpResponseMessage response, string setup)
    {
        if (!response.IsSuccessStatusCode)
        {
            Assert.Fail($"setup failed — {setup}: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        }
    }

    private static Guid IdOf(JsonElement body) => body.GetProperty("id").GetGuid();

    private Guid Saved(string key) => Guid.Parse(state.Values[key]);

    private async Task<Guid> CreateGroupAsync(string code)
    {
        var response = await SendAsync(HttpMethod.Post, GroupsPath, new
        {
            code, name = code, type = "Customer", ownerId = state.CallerClientId
        });
        await ShouldSucceedAsync(response, $"creating account group {code}");
        var id = IdOf(await JsonAsync(response));
        state.Values[$"group:{code}"] = id.ToString();
        return id;
    }

    private async Task<Guid> DefaultGroupAsync()
    {
        if (state.Values.TryGetValue("group:__default", out var existing))
        {
            return Guid.Parse(existing);
        }

        var id = await CreateGroupAsync($"C{Guid.NewGuid():N}"[..5].ToUpperInvariant());
        state.Values["group:__default"] = id.ToString();
        return id;
    }

    private async Task<HttpResponseMessage> PostAccountAsync(
        string currency,
        Guid? groupId = null,
        string? accountNumber = null,
        bool permittedToGoNegative = false,
        decimal? overdraftLimit = null,
        decimal? minimumBalance = null) =>
        await SendAsync(HttpMethod.Post, AccountsPath, new
        {
            groupId = groupId ?? await DefaultGroupAsync(),
            accountNumber,
            name = $"PayHub {currency}",
            currency,
            classification = "Liability",
            permittedToGoNegative,
            overdraftLimit,
            minimumBalance
        });

    private async Task<Guid> OpenAccountAsync(
        string currency,
        Guid? groupId = null,
        string? accountNumber = null,
        bool permittedToGoNegative = false,
        decimal? overdraftLimit = null)
    {
        var response = await PostAccountAsync(currency, groupId, accountNumber, permittedToGoNegative, overdraftLimit);
        await ShouldSucceedAsync(response, $"opening a {currency} account");
        var id = IdOf(await JsonAsync(response));
        state.Values["account"] = id.ToString();
        return id;
    }

    private Task<HttpResponseMessage> PostPostingAsync(
        Guid accountId, string direction, decimal amount, string currency, string? key = null) =>
        SendAsync(HttpMethod.Post, PostingsPath,
            new { accountId, direction, amount, currency, category = "Transfer" }, key);

    private async Task<Guid> RecordAsync(Guid accountId, string direction, decimal amount, string currency, string? key = null)
    {
        var response = await PostPostingAsync(accountId, direction, amount, currency, key);
        await ShouldSucceedAsync(response, $"recording a {direction.ToLowerInvariant()} of {amount} {currency}");
        return IdOf(await JsonAsync(response));
    }

    private Task<HttpResponseMessage> PostBatchAsync(object[] movements, string? key = null) =>
        SendAsync(HttpMethod.Post, $"{PostingsPath}/batch", new { movements }, key);

    private static object Movement(Guid accountId, string direction, decimal amount, string currency) =>
        new { accountId, direction, amount, currency, category = "Transfer" };

    private async Task<decimal> BalanceOfAsync(Guid accountId)
    {
        var response = await SendAsync(HttpMethod.Get, $"{AccountsPath}/{accountId}/balance");
        response.IsSuccessStatusCode.ShouldBeTrue($"reading the balance of {accountId} answered {(int)response.StatusCode}");
        return (await JsonAsync(response)).GetProperty("balance").GetDecimal();
    }

    private async Task<List<JsonElement>> ListAsync(string path)
    {
        var response = await SendAsync(HttpMethod.Get, $"{path}?pageSize=100");
        var body = await JsonAsync(response);
        response.IsSuccessStatusCode.ShouldBeTrue($"listing {path} answered {(int)response.StatusCode}: {body}");
        return [.. body.GetProperty("items").EnumerateArray()];
    }

    private async Task<JsonElement> ListedCurrencyAsync(string code)
    {
        var body = await JsonAsync(state.Response!);
        state.Response!.IsSuccessStatusCode.ShouldBeTrue($"listing the currencies answered {(int)state.Response.StatusCode}: {body}");
        var item = body.GetProperty("items").EnumerateArray().FirstOrDefault(c => c.GetProperty("code").GetString() == code);
        item.ValueKind.ShouldNotBe(JsonValueKind.Undefined, $"{code} is not listed: {body}");
        return item;
    }

    private static string LimitProperty(string limit) =>
        limit is "a minimum balance" or "minimum balance" ? "minimumBalance" : "overdraftLimit";

    #endregion

    #region Seeded currencies

    [Given(@"^a fresh Accounts database$")]
    public async Task GivenAFreshAccountsDatabase()
    {
        _scratch = new ScratchDatabaseApiFactory(factory.ContainerConnectionString);
        await _scratch.MigrateToLatestAsync();
    }

    [When(@"^treasury-ops lists the currencies$")]
    public async Task WhenTreasuryOpsListsTheCurrencies() =>
        state.Response = await SendAsync(HttpMethod.Get, $"{CurrenciesPath}?pageSize=100");

    [Then(@"^(\w+) is listed as ""([^""]+)"" with (\d+) decimal places$")]
    public async Task ThenIsListedAsWithDecimalPlaces(string code, string name, int places)
    {
        var item = await ListedCurrencyAsync(code);
        item.GetProperty("name").GetString().ShouldBe(name);
        item.GetProperty("decimalPlaces").GetInt32().ShouldBe(places);
    }

    [Then(@"^(\w+) is active$")]
    public async Task ThenIsActive(string code) =>
        (await ListedCurrencyAsync(code)).GetProperty("isActive").GetBoolean().ShouldBeTrue();

    [Then(@"^(\w+) has the id ([0-9a-f-]{36})$")]
    public async Task ThenHasTheId(string code, string id) =>
        (await ListedCurrencyAsync(code)).GetProperty("id").GetGuid().ShouldBe(Guid.Parse(id));

    [Then(@"^(\d+) currencies are listed$")]
    public async Task ThenCurrenciesAreListed(int count)
    {
        var body = await JsonAsync(state.Response!);
        state.Response!.IsSuccessStatusCode.ShouldBeTrue($"listing the currencies answered {(int)state.Response.StatusCode}: {body}");
        var codes = body.GetProperty("items").EnumerateArray().Select(c => c.GetProperty("code").GetString()).ToList();
        codes.Count.ShouldBe(count, $"listed: {string.Join(", ", codes)}");
    }

    #endregion

    #region Accounts and postings

    [Given(@"^the account group (\w+) is active$")]
    public async Task GivenTheAccountGroupIsActive(string code) => await CreateGroupAsync(code);

    [When(@"^treasury-ops opens a (\w+) account for PayHub in (\w+)$")]
    public async Task WhenTreasuryOpsOpensAnAccountForPayHubIn(string currency, string groupCode) =>
        state.Response = await PostAccountAsync(currency, Saved($"group:{groupCode}"));

    [Then(@"^the account is open in (\w+)$")]
    public async Task ThenTheAccountIsOpenIn(string currency)
    {
        var body = await JsonAsync(state.Response!);
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created, body.ToString());
        body.GetProperty("currency").GetString().ShouldBe(currency);
        body.GetProperty("status").GetString().ShouldBe("active");
    }

    [Then(@"^its balance is ([\d,.]+) (\w+)$")]
    public async Task ThenItsBalanceIs(string balance, string currency)
    {
        var body = await JsonAsync(state.Response!);
        body.GetProperty("balance").GetDecimal().ShouldBe(Amount(balance));
        body.GetProperty("currency").GetString().ShouldBe(currency);
    }

    [Given(@"^PayHub holds an? (\w+) account with a balance of ([\d,.]+)(?: \w+)?$")]
    public async Task GivenPayHubHoldsAnAccountWithABalanceOf(string currency, string balance)
    {
        var accountId = await OpenAccountAsync(currency);
        if (Amount(balance) > 0)
        {
            await RecordAsync(accountId, "Credit", Amount(balance), currency);
        }
    }

    [Given(@"^treasury-ops has registered ""([^""]+)"" as (\w+) with (\d+) decimal places$")]
    public async Task GivenTreasuryOpsHasRegistered(string name, string code, int places) =>
        await ShouldSucceedAsync(
            await SendAsync(HttpMethod.Post, CurrenciesPath, new { code, name, decimalPlaces = places }),
            $"registering {code} with {places} decimal places");

    [When(@"^PayHub records a credit of ([\d,.]+) (\w+)$")]
    public async Task WhenPayHubRecordsACreditOf(string amount, string currency) =>
        state.Response = await PostPostingAsync(Saved("account"), "Credit", Amount(amount), currency);

    [When(@"^PayHub records a credit of ([\d,.]+) (\w+) as (a single posting|one leg of a batch)$")]
    public async Task WhenPayHubRecordsACreditOfAs(string amount, string currency, string recordedAs)
    {
        if (recordedAs == "a single posting")
        {
            state.Response = await PostPostingAsync(Saved("account"), "Credit", Amount(amount), currency);
            return;
        }

        // The other leg: a second account of the same currency that already holds the amount it gives up, so
        // the only rule the batch can break is the ceiling on PayHub's account.
        var payHubAccount = Saved("account");
        var fundingAccount = await OpenAccountAsync(currency);
        state.Values["account"] = payHubAccount.ToString();
        await RecordAsync(fundingAccount, "Credit", Amount(amount), currency);
        state.Response = await PostBatchAsync(
        [
            Movement(fundingAccount, "Debit", Amount(amount), currency),
            Movement(payHubAccount, "Credit", Amount(amount), currency)
        ]);
    }

    [Then(@"^the posting is accepted$")]
    public async Task ThenThePostingIsAccepted() =>
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created, await state.Response.Content.ReadAsStringAsync());

    [Then(@"^the (?:posting|reversal|request) is refused with ""([^""]+)""$")]
    public async Task ThenIsRefusedWith(string code)
    {
        // Every ledger refusal answers 422 except the idempotency conflict, which keeps its 409 (spec §3 R5).
        var expectedStatus = code == "IDEMPOTENCY_KEY_CONFLICT" ? HttpStatusCode.Conflict : HttpStatusCode.UnprocessableEntity;
        var body = await JsonAsync(state.Response!);
        state.Response!.StatusCode.ShouldBe(expectedStatus, body.ToString());
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var c) && c.GetString() == code)
            .ShouldBeTrue($"expected an error carrying code {code}, got: {body}");
    }

    [Then(@"^the account balance is (?:still )?([\d,.]+)$")]
    public async Task ThenTheAccountBalanceIs(string balance) => await ThenTheAccountBalanceIs(balance, "");

    [Then(@"^the account balance is (?:still )?([\d,.]+) (\w+)$")]
    public async Task ThenTheAccountBalanceIs(string balance, string currency)
    {
        var response = await SendAsync(HttpMethod.Get, $"{AccountsPath}/{Saved("account")}/balance");
        var body = await JsonAsync(response);
        response.IsSuccessStatusCode.ShouldBeTrue($"reading the balance answered {(int)response.StatusCode}: {body}");
        body.GetProperty("balance").GetDecimal().ShouldBe(Amount(balance));
        if (!string.IsNullOrEmpty(currency))
        {
            body.GetProperty("currency").GetString().ShouldBe(currency);
        }
    }

    #endregion

    #region Registering a currency

    [When(@"^treasury-ops registers ""([^""]+)"" as (\w+) with (\d+) decimal places$")]
    public async Task WhenTreasuryOpsRegisters(string name, string code, int places)
    {
        state.Values["registered:code"] = code;
        state.Values["registered:places"] = places.ToString(CultureInfo.InvariantCulture);
        state.Response = await SendAsync(HttpMethod.Post, CurrenciesPath, new { code, name, decimalPlaces = places });
    }

    [Then(@"^the registration is accepted$")]
    public async Task ThenTheRegistrationIsAccepted()
    {
        var code = state.Values["registered:code"];
        var places = int.Parse(state.Values["registered:places"], CultureInfo.InvariantCulture);
        var body = await JsonAsync(state.Response!);
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created, body.ToString());
        body.GetProperty("code").GetString().ShouldBe(code);
        body.GetProperty("decimalPlaces").GetInt32().ShouldBe(places);

        var listed = (await ListAsync(CurrenciesPath)).Single(c => c.GetProperty("code").GetString() == code);
        listed.GetProperty("decimalPlaces").GetInt32().ShouldBe(places);
        listed.GetProperty("isActive").GetBoolean().ShouldBeTrue();
    }

    [Then(@"^the registration is refused$")]
    public async Task ThenTheRegistrationIsRefused()
    {
        var code = state.Values["registered:code"];
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.BadRequest, await state.Response.Content.ReadAsStringAsync());
        (await ListAsync(CurrenciesPath)).ShouldNotContain(c => c.GetProperty("code").GetString() == code);
    }

    #endregion

    #region Reversal

    [Given(@"^PayHub's (\w+) account stood at ([\d,.]+) \w+$")]
    public async Task GivenPayHubsAccountStoodAt(string currency, string balance)
    {
        var accountId = await OpenAccountAsync(currency);
        await RecordAsync(accountId, "Credit", Amount(balance), currency);
    }

    [Given(@"^PayHub recorded a debit of ([\d,.]+) (\w+), then a credit of ([\d,.]+) \w+$")]
    public async Task GivenPayHubRecordedADebitThenACredit(string debit, string currency, string credit)
    {
        state.Values["posting:debit"] = (await RecordAsync(Saved("account"), "Debit", Amount(debit), currency)).ToString();
        await RecordAsync(Saved("account"), "Credit", Amount(credit), currency);
    }

    [When(@"^treasury-ops reverses the debit$")]
    public async Task WhenTreasuryOpsReversesTheDebit() =>
        state.Response = await SendAsync(
            HttpMethod.Post, $"{PostingsPath}/{Saved("posting:debit")}/reverse",
            new { reason = "Recorded in error" }, $"rev-{Guid.NewGuid():N}");

    #endregion

    #region Account limits

    [When(@"^treasury-ops opens an? (\w+) account allowed to go negative with (a minimum balance|an overdraft limit) of ([\d,.]+) \w+$")]
    public async Task WhenTreasuryOpsOpensAnAccountAllowedToGoNegativeWith(string currency, string limit, string amount) =>
        state.Response = LimitProperty(limit) == "overdraftLimit"
            ? await PostAccountAsync(currency, permittedToGoNegative: true, overdraftLimit: Amount(amount))
            : await PostAccountAsync(currency, permittedToGoNegative: true, overdraftLimit: 0m, minimumBalance: Amount(amount));

    [When(@"^treasury-ops opens an? (\w+) account with (a minimum balance|an overdraft limit) of ([\d,.]+) \w+$")]
    public async Task WhenTreasuryOpsOpensAnAccountWith(string currency, string limit, string amount) =>
        state.Response = LimitProperty(limit) == "overdraftLimit"
            ? await PostAccountAsync(currency, overdraftLimit: Amount(amount))
            : await PostAccountAsync(currency, minimumBalance: Amount(amount));

    [When(@"^treasury-ops sets an existing (\w+) account to (a minimum balance|an overdraft limit) of ([\d,.]+) \w+$")]
    public async Task WhenTreasuryOpsSetsAnExistingAccountTo(string currency, string limit, string amount)
    {
        var accountId = await OpenAccountAsync(currency);
        var body = LimitProperty(limit) == "overdraftLimit"
            ? (object)new { overdraftLimit = Amount(amount) }
            : new { minimumBalance = Amount(amount) };
        state.Response = await SendAsync(HttpMethod.Patch, $"{AccountsPath}/{accountId}", body);
    }

    [Then(@"^the refusal names the (minimum balance|overdraft limit)$")]
    public async Task ThenTheRefusalNamesThe(string field)
    {
        // The refusal's own error entry names the field (spec §3a): the code and the field on one entry.
        var expectedField = field == "minimum balance" ? "MinimumBalance" : "OverdraftLimit";
        var body = await JsonAsync(state.Response!);
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var c) && c.GetString() == "INVALID_LIMIT_AMOUNT"
                && e.TryGetProperty("field", out var f) && f.GetString() == expectedField)
            .ShouldBeTrue($"expected the INVALID_LIMIT_AMOUNT entry to name {expectedField}, got: {body}");
    }

    [Then(@"^no account holds (a minimum balance|an overdraft limit) of ([\d,.]+) \w+$")]
    public async Task ThenNoAccountHolds(string limit, string amount)
    {
        var property = LimitProperty(limit);
        var accounts = await ListAsync(AccountsPath);
        if (state.Values.TryGetValue("account", out var opened))
        {
            // Presence sibling: the account this scenario opened is listed, so the absence below is not the
            // list simply coming back empty.
            accounts.ShouldContain(a => a.GetProperty("id").GetGuid() == Guid.Parse(opened));
        }

        // The API omits a null limit from the body (SharedConsts WhenWritingNull), so an absent member is "holds no limit".
        accounts.Where(a =>
            a.TryGetProperty(property, out var v) && v.ValueKind == JsonValueKind.Number && v.GetDecimal() == Amount(amount))
            .ShouldBeEmpty();
    }

    #endregion

    #region Replays

    [Given(@"^PayHub recorded a credit of ([\d,.]+) (\w+) under key ""([^""]+)""$")]
    public async Task GivenPayHubRecordedACreditUnderKey(string amount, string currency, string key)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["posting"] = (await RecordAsync(accountId, "Credit", Amount(amount), currency, key)).ToString();
        state.Values["first amount"] = amount;
    }

    [When(@"^PayHub sends the same credit again as ([\d,.]+) (\w+) under key ""([^""]+)""$")]
    [When(@"^PayHub sends a credit of ([\d,.]+) (\w+) under key ""([^""]+)""$")]
    public async Task WhenPayHubSendsACreditUnderKey(string amount, string currency, string key) =>
        state.Response = await PostPostingAsync(Saved("account"), "Credit", Amount(amount), currency, key);

    [Then(@"^the original posting is returned$")]
    public async Task ThenTheOriginalPostingIsReturned()
    {
        var body = await JsonAsync(state.Response!);
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK, body.ToString());
        IdOf(body).ShouldBe(Saved("posting"));
    }

    [Then(@"^the account balance moved only once$")]
    public async Task ThenTheAccountBalanceMovedOnlyOnce() =>
        (await BalanceOfAsync(Saved("account"))).ShouldBe(Amount(state.Values["first amount"]));

    [Given(@"^PayHub recorded a batch moving ([\d,.]+) (\w+) from ([A-Z]+)-(\d+) to ([A-Z]+)-(\d+) under key ""([^""]+)""$")]
    public async Task GivenPayHubRecordedABatchMoving(
        string amount, string currency, string fromGroup, string fromNumber, string toGroup, string toNumber, string key)
    {
        var groupId = await CreateGroupAsync(fromGroup);
        // The paying account may go negative (floor -100), so the batch's only content is the one movement.
        var from = await OpenAccountAsync(currency, groupId, fromNumber, permittedToGoNegative: true, overdraftLimit: 100m);
        var to = await OpenAccountAsync(currency, fromGroup == toGroup ? groupId : await CreateGroupAsync(toGroup), toNumber);
        state.Values["account:from"] = from.ToString();
        state.Values["account:to"] = to.ToString();
        state.Values["first amount"] = amount;

        var response = await PostBatchAsync(
            [Movement(from, "Debit", Amount(amount), currency), Movement(to, "Credit", Amount(amount), currency)], key);
        await ShouldSucceedAsync(response, $"recording the batch under {key}");
        state.Values["batch"] = string.Join(',', (await JsonAsync(response)).EnumerateArray().Select(IdOf).Order());
    }

    [When(@"^PayHub sends the same batch again with ([\d,.]+) (\w+) under key ""([^""]+)""$")]
    public async Task WhenPayHubSendsTheSameBatchAgainWith(string amount, string currency, string key) =>
        state.Response = await PostBatchAsync(
        [
            Movement(Saved("account:from"), "Debit", Amount(amount), currency),
            Movement(Saved("account:to"), "Credit", Amount(amount), currency)
        ], key);

    [Then(@"^the original batch is returned$")]
    public async Task ThenTheOriginalBatchIsReturned()
    {
        var body = await JsonAsync(state.Response!);
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK, body.ToString());
        string.Join(',', body.EnumerateArray().Select(IdOf).Order()).ShouldBe(state.Values["batch"]);
    }

    [Then(@"^each account balance moved only once$")]
    public async Task ThenEachAccountBalanceMovedOnlyOnce()
    {
        var amount = Amount(state.Values["first amount"]);
        (await BalanceOfAsync(Saved("account:from"))).ShouldBe(-amount);
        (await BalanceOfAsync(Saved("account:to"))).ShouldBe(amount);
    }

    #endregion

    #region Amounts at the currency's scale

    [When(@"^treasury-ops reads that account$")]
    public async Task WhenTreasuryOpsReadsThatAccount() =>
        state.Response = await SendAsync(HttpMethod.Get, $"{AccountsPath}/{Saved("account")}");

    [Then(@"^the service states the balance as ([\d.]+)$")]
    public async Task ThenTheServiceStatesTheBalanceAs(string stated)
    {
        // The JSON token itself, not its value: 5000 and 5000.00 are equal decimals but different statements.
        var byId = await JsonAsync(state.Response!);
        state.Response!.IsSuccessStatusCode.ShouldBeTrue($"reading the account answered {(int)state.Response.StatusCode}: {byId}");
        byId.GetProperty("balance").GetRawText().ShouldBe(stated);

        var listed = (await ListAsync(AccountsPath)).Single(a => a.GetProperty("id").GetGuid() == Saved("account"));
        listed.GetProperty("balance").GetRawText().ShouldBe(stated);
    }

    #endregion
}

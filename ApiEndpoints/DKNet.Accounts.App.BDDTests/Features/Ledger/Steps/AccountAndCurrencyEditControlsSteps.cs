using System.Net.Http.Json;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-1659 §5 surface 3 — the account permission-to-go-negative edit and the currency
/// deactivation refusal. <c>PATCH /v1/accounts/{id}</c> does not accept <c>permittedToGoNegative</c> yet
/// (the field is silently dropped by System.Text.Json, so the request succeeds but the permission never
/// changes) and <c>POST /v1/currencies/{id}/deactivate</c> never checks held balances yet — both are Build's
/// job — so every scenario here is red for a nameable reason: an unchanged permission, or a refusal that
/// never arrives.
/// </summary>
[Binding]
public sealed class AccountAndCurrencyEditControlsSteps(HttpClient client, ScenarioState state)
{
    private const string AccountsPath = "/v1/accounts";
    private const string CurrenciesPath = "/v1/currencies";
    private const string GroupsPath = "/v1/account-groups";

    #region Shared helpers

    private async Task<Guid> CreateGroupAsync() =>
        (await TryReadIdAsync(await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code = $"G{Guid.NewGuid():N}"[..5].ToUpperInvariant(),
            name = "Edit Controls Test Group",
            type = "Customer",
            ownerId = state.CallerClientId
        })))!.Value;

    private async Task<Guid> OpenAcmeAccountAsync(
        string currency, bool permittedToGoNegative = false, decimal? overdraftLimit = null)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId = await CreateGroupAsync(),
            name = "ACME",
            currency,
            classification = "Liability",
            permittedToGoNegative,
            overdraftLimit
        });
        var id = (await TryReadIdAsync(response))!.Value;
        state.Values["account"] = id.ToString();
        return id;
    }

    private async Task RecordPostingAsync(Guid accountId, decimal amount, string currency) =>
        await client.SendAsCallerAsync(state, HttpMethod.Post, "/v1/postings", new
        {
            accountId, direction = "Credit", amount, currency, category = "Transfer"
        });

    private async Task<Guid> ResolveCurrencyIdAsync(string code)
    {
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, CurrenciesPath));
        return doc.GetProperty("items").EnumerateArray()
            .First(c => string.Equals(c.GetProperty("code").GetString(), code, StringComparison.OrdinalIgnoreCase))
            .GetProperty("id").GetGuid();
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

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response) =>
        JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());

    #endregion

    #region Given

    [Given(@"the ""ACME"" account is not permitted to go negative$")]
    public async Task GivenTheAcmeAccountIsNotPermittedToGoNegative() =>
        await OpenAcmeAccountAsync("SGD");

    [Given(@"the ""ACME"" account is not permitted to go negative and states no overdraft limit")]
    public async Task GivenTheAcmeAccountIsNotPermittedToGoNegativeAndStatesNoOverdraftLimit() =>
        await OpenAcmeAccountAsync("SGD");

    [Given(@"the ""ACME"" account holds 100\.00 SGD")]
    public async Task GivenTheAcmeAccountHolds100Sgd()
    {
        var accountId = await OpenAcmeAccountAsync("SGD");
        await RecordPostingAsync(accountId, 100.00m, "SGD");
    }

    [Given(@"no account holds a balance in JPY")]
    public void GivenNoAccountHoldsABalanceInJpy()
    {
        // JPY is seeded reference data (Currencies.feature) with no account opened against it by this
        // scenario or any fixture it shares state with — nothing to set up.
    }

    #endregion

    #region When

    [When(@"treasury-ops permits it to go negative up to 500\.00 SGD")]
    public async Task WhenTreasuryOpsPermitsItToGoNegativeUpTo500Sgd()
    {
        var accountId = state.Values["account"];
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Patch, $"{AccountsPath}/{accountId}",
            new { permittedToGoNegative = true, overdraftLimit = 500.00m });
    }

    [When(@"treasury-ops permits it to go negative and states no overdraft limit")]
    public async Task WhenTreasuryOpsPermitsItToGoNegativeAndStatesNoOverdraftLimit()
    {
        var accountId = state.Values["account"];
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Patch, $"{AccountsPath}/{accountId}",
            new { permittedToGoNegative = true });
    }

    [When(@"treasury-ops deactivates the SGD currency")]
    public async Task WhenTreasuryOpsDeactivatesTheSgdCurrency()
    {
        var currencyId = await ResolveCurrencyIdAsync("SGD");
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{CurrenciesPath}/{currencyId}/deactivate");
    }

    [When(@"treasury-ops deactivates the JPY currency")]
    public async Task WhenTreasuryOpsDeactivatesTheJpyCurrency()
    {
        var currencyId = await ResolveCurrencyIdAsync("JPY");
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{CurrenciesPath}/{currencyId}/deactivate");
    }

    #endregion

    #region Then

    [Then(@"the account is permitted to go negative$")]
    public async Task ThenTheAccountIsPermittedToGoNegative()
    {
        var accountId = state.Values["account"];
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{accountId}"));
        doc.GetProperty("permittedToGoNegative").GetBoolean().ShouldBeTrue();
    }

    [Then(@"its floor reads -500\.00 SGD")]
    public async Task ThenItsFloorReadsMinus50000Sgd()
    {
        var accountId = state.Values["account"];
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{accountId}/balance"));
        doc.GetProperty("floor").GetDecimal().ShouldBe(-500.00m);
    }

    [Then(@"the account is still not permitted to go negative")]
    public async Task ThenTheAccountIsStillNotPermittedToGoNegative()
    {
        var accountId = state.Values["account"];
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{accountId}"));
        doc.GetProperty("permittedToGoNegative").GetBoolean().ShouldBeFalse();
    }

    [Then(@"SGD is still active")]
    public async Task ThenSgdIsStillActive()
    {
        var currencyId = await ResolveCurrencyIdAsync("SGD");
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{CurrenciesPath}/{currencyId}"));
        doc.GetProperty("isActive").GetBoolean().ShouldBeTrue();
    }

    [Then(@"JPY is no longer active")]
    public async Task ThenJpyIsNoLongerActive()
    {
        var currencyId = await ResolveCurrencyIdAsync("JPY");
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{CurrenciesPath}/{currencyId}"));
        doc.GetProperty("isActive").GetBoolean().ShouldBeFalse();
    }

    #endregion
}

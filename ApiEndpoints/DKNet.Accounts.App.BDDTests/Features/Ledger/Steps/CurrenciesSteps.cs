using System.Net.Http.Json;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for the Currency aggregate (create/rename/activate/deactivate/list) and the
/// IsActive-driven UNSUPPORTED_CURRENCY refusal it feeds into Accounts. Reuses the generic refusal/success
/// Then steps already bound elsewhere (<c>the request succeeds</c>, <c>the request is refused with status
/// ... and the code "..."</c>, <c>the request answers (\d+)</c>, <c>PayHub reads the supported currencies</c>)
/// rather than redefining them — Reqnroll resolves step text across the whole assembly, not per feature file.
/// </summary>
[Binding]
public sealed class CurrenciesSteps(HttpClient client, ScenarioState state)
{
    private const string CurrenciesPath = "/v1/currencies";
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";

    #region Shared helpers

    private async Task<Guid> CreateCurrencyAsync(string code, string name, int decimalPlaces)
    {
        var response = await client.SendAsCallerAsync(
            state, HttpMethod.Post, CurrenciesPath, new { code, name, decimalPlaces });
        state.Response = response;
        var id = await TryReadIdAsync(response);
        if (id is not null)
        {
            state.Values[$"currency:{code.ToUpperInvariant()}"] = id.Value.ToString();
        }

        return id ?? Guid.Empty;
    }

    /// <summary>Resolves a currency's id by code, looking it up through the list route when the scenario
    /// never created it itself (the three seeded currencies) — caches the result under the same normalized
    /// key <see cref="CreateCurrencyAsync"/> writes, so either path leaves later steps able to find it.</summary>
    private async Task<Guid> ResolveCurrencyIdAsync(string code)
    {
        var key = $"currency:{code.ToUpperInvariant()}";
        if (Guid.TryParse(state.Values.GetValueOrDefault(key), out var cached) && cached != Guid.Empty)
        {
            return cached;
        }

        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, CurrenciesPath));
        var id = doc.GetProperty("items").EnumerateArray()
            .First(c => string.Equals(c.GetProperty("code").GetString(), code, StringComparison.OrdinalIgnoreCase))
            .GetProperty("id").GetGuid();
        state.Values[key] = id.ToString();
        return id;
    }

    /// <summary>The scenario's throwaway account group, created once and reused — mirrors
    /// <c>LedgerSteps.DefaultGroupAsync</c> for scenarios that open an account without naming a group.</summary>
    private async Task<Guid> DefaultGroupAsync()
    {
        if (Guid.TryParse(state.Values.GetValueOrDefault("group:__default"), out var existing) && existing != Guid.Empty)
        {
            return existing;
        }

        var code = $"D{Guid.NewGuid():N}"[..5].ToUpperInvariant();
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code, name = code, type = "Customer", ownerId = state.CallerClientId
        });
        var id = (await TryReadIdAsync(response))!.Value;
        state.Values["group:__default"] = id.ToString();
        return id;
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

    #region Given

    [Given(@"PayHub has created the currency ""([^""]+)"" named ""([^""]+)"" with (\d+) decimal places")]
    public async Task GivenPayHubHasCreatedTheCurrencyNamedWithDecimalPlaces(
        string code, string name, int decimalPlaces) =>
        await CreateCurrencyAsync(code, name, decimalPlaces);

    [Given(@"PayHub has deactivated the currency ""([^""]+)""")]
    public async Task GivenPayHubHasDeactivatedTheCurrency(string code)
    {
        var id = await ResolveCurrencyIdAsync(code);
        (await client.SendAsCallerAsync(state, HttpMethod.Post, $"{CurrenciesPath}/{id}/deactivate"))
            .IsSuccessStatusCode.ShouldBeTrue($"expected deactivating {code} to succeed as fixture setup");
    }

    [Given(@"PayHub has reactivated the currency ""([^""]+)""")]
    public async Task GivenPayHubHasReactivatedTheCurrency(string code)
    {
        var id = await ResolveCurrencyIdAsync(code);
        (await client.SendAsCallerAsync(state, HttpMethod.Post, $"{CurrenciesPath}/{id}/activate"))
            .IsSuccessStatusCode.ShouldBeTrue($"expected reactivating {code} to succeed as fixture setup");
    }

    #endregion

    #region When

    [When(@"PayHub creates the currency ""([^""]+)"" named ""([^""]+)"" with (\d+) decimal places")]
    public async Task WhenPayHubCreatesTheCurrencyNamedWithDecimalPlaces(
        string code, string name, int decimalPlaces) =>
        await CreateCurrencyAsync(code, name, decimalPlaces);

    [When(@"PayHub renames the currency ""([^""]+)"" to ""([^""]+)""")]
    public async Task WhenPayHubRenamesTheCurrencyTo(string code, string newName)
    {
        var id = await ResolveCurrencyIdAsync(code);
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Put, $"{CurrenciesPath}/{id}", new { name = newName });
    }

    [When(@"PayHub opens an account denominated in ""([^""]+)""")]
    public async Task WhenPayHubOpensAnAccountDenominatedIn(string currency)
    {
        var groupId = await DefaultGroupAsync();
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId,
            name = "Test Account",
            currency,
            classification = "Liability"
        });
    }

    [When(@"PayHub attempts to delete the currency ""([^""]+)""")]
    public async Task WhenPayHubAttemptsToDeleteTheCurrency(string code)
    {
        var id = await ResolveCurrencyIdAsync(code);
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Delete, $"{CurrenciesPath}/{id}");
    }

    #endregion

    #region Then

    [Then(@"""([^""]+)"" appears in the currency list as active with (\d+) decimal places")]
    public async Task ThenAppearsInTheCurrencyListAsActiveWithDecimalPlaces(string code, int decimalPlaces)
    {
        var expectedId = state.Values[$"currency:{code.ToUpperInvariant()}"];
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, CurrenciesPath));
        var item = doc.GetProperty("items").EnumerateArray()
            .FirstOrDefault(c => c.GetProperty("code").GetString() == code.ToUpperInvariant());
        item.ValueKind.ShouldNotBe(JsonValueKind.Undefined, $"expected {code} to be listed, got: {doc}");
        item.GetProperty("id").GetGuid().ShouldBe(Guid.Parse(expectedId));
        item.GetProperty("isActive").GetBoolean().ShouldBeTrue();
        item.GetProperty("decimalPlaces").GetInt32().ShouldBe(decimalPlaces);
    }

    [Then(@"the currency ""([^""]+)"" is now named ""([^""]+)"", still coded ""([^""]+)"" with (\d+) decimal places")]
    public async Task ThenTheCurrencyIsNowNamedStillCodedWithDecimalPlaces(
        string codeKey, string expectedName, string expectedCode, int expectedDecimalPlaces)
    {
        var id = await ResolveCurrencyIdAsync(codeKey);
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, $"{CurrenciesPath}/{id}"));
        doc.GetProperty("name").GetString().ShouldBe(expectedName);
        doc.GetProperty("code").GetString().ShouldBe(expectedCode);
        doc.GetProperty("decimalPlaces").GetInt32().ShouldBe(expectedDecimalPlaces);
    }

    [Then(@"""([^""]+)"" is listed as inactive")]
    public async Task ThenIsListedAsInactive(string code)
    {
        var doc = await ReadJsonAsync(await client.SendAsCallerAsync(state, HttpMethod.Get, CurrenciesPath));
        var item = doc.GetProperty("items").EnumerateArray()
            .FirstOrDefault(c => c.GetProperty("code").GetString() == code.ToUpperInvariant());
        item.ValueKind.ShouldNotBe(JsonValueKind.Undefined, $"expected {code} to still be listed, got: {doc}");
        item.GetProperty("isActive").GetBoolean().ShouldBeFalse();
    }

    [Then(@"the refusal names the ""([^""]+)"" field")]
    public async Task ThenTheRefusalNamesTheField(string expectedField)
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("field", out var field) && field.GetString() == expectedField)
            .ShouldBeTrue($"expected a '{expectedField}' field error, got: {doc}");
    }

    #endregion
}

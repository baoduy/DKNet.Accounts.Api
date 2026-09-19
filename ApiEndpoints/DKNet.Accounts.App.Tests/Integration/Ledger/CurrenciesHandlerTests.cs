using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// Covers the Currency CRUD surface (create/rename/activate/deactivate/list) and the IsActive-driven refusal
/// paths it feeds into on Accounts and Postings — including the lowercase-currency-code regression this
/// feature fixed (accounts/postings used to compare currency codes case-sensitively).
/// </summary>
public sealed class CurrenciesHandlerTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string CurrenciesPath = "/v1/currencies";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

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

    // Distinct, purely alphabetic 3-letter codes (the validator's regex is ^[A-Za-z]{3}$, so a Guid-derived
    // code with digits would never pass) that stay well clear of the seeded SGD/USD/JPY.
    private static int _codeCounter;

    private static string NextCode()
    {
        var n = ++_codeCounter;
        return new string([(char)('A' + n / 676 % 26), (char)('A' + n / 26 % 26), (char)('A' + n % 26)]);
    }

    private async Task<Guid> CreateCurrencyAsync(string? code = null, string name = "Test Currency", int decimalPlaces = 2)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, CurrenciesPath, new
        {
            code = code ?? NextCode(),
            name,
            decimalPlaces
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    private Task<HttpResponseMessage> DeactivateAsync(Guid id) =>
        Client.SendAsync(AsPayHub(HttpMethod.Post, $"{CurrenciesPath}/{id}/deactivate"));

    private Task<HttpResponseMessage> ActivateAsync(Guid id) =>
        Client.SendAsync(AsPayHub(HttpMethod.Post, $"{CurrenciesPath}/{id}/activate"));

    /// <summary>Creates a currency and immediately deactivates it, returning its (uppercased) code.</summary>
    private async Task<string> CreateDeactivatedCurrencyAsync()
    {
        var code = NextCode();
        var id = await CreateCurrencyAsync(code);
        (await DeactivateAsync(id)).EnsureSuccessStatusCode();
        return code;
    }

    private Guid? _fixtureGroupId;

    private async Task<Guid> FixtureGroupIdAsync()
    {
        if (_fixtureGroupId is not null)
        {
            return _fixtureGroupId.Value;
        }

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, "/v1/account-groups", new
        {
            code = $"G{Guid.NewGuid():N}"[..5].ToUpperInvariant(),
            name = "Fixture Group",
            type = "Customer",
            ownerId = "PayHub"
        }));
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        _fixtureGroupId = created.GetProperty("id").GetGuid();
        return _fixtureGroupId.Value;
    }

    private async Task<HttpResponseMessage> OpenAccountAsync(string currency) =>
        await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = await FixtureGroupIdAsync(),
            name = "Operating",
            currency,
            // Liability, not Asset: a Credit posting increases a Liability's balance, so the
            // posting-side tests below (Credit 10) never trip the floor guard before reaching the
            // currency check they're actually exercising.
            classification = "Liability",
            permittedToGoNegative = false
        }));

    private async Task<Guid> OpenSgdAccountAsync()
    {
        var response = await OpenAccountAsync("SGD");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private Task<HttpResponseMessage> RecordAsync(Guid accountId, string currency) =>
        Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId,
            direction = "Credit",
            amount = 10m,
            currency,
            category = "Transfer"
        }));

    // ---- Create ----------------------------------------------------------

    [Fact]
    public async Task Creating_WithALowercaseCode_StoresItUppercased()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, CurrenciesPath, new
        {
            code = "chf",
            name = "Swiss Franc",
            decimalPlaces = 2
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe("CHF");
    }

    [Fact]
    public async Task Creating_WithACodeThatAlreadyExists_IsRefused()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, CurrenciesPath, new
        {
            code = "SGD",
            name = "Duplicate",
            decimalPlaces = 2
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.DuplicateCurrencyCode)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.DuplicateCurrencyCode}, got: {body}");
    }

    [Fact]
    public async Task Creating_WithADuplicateCode_IsRefusedRegardlessOfCase()
    {
        // SGD is seeded uppercase; submitting "sgd" must still collide — the duplicate check compares
        // uppercased, matching the constructor's own normalisation.
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, CurrenciesPath, new
        {
            code = "sgd",
            name = "Duplicate lowercase",
            decimalPlaces = 2
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.DuplicateCurrencyCode)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.DuplicateCurrencyCode}, got: {body}");
    }

    [Theory]
    [InlineData("AB")]
    [InlineData("ABCD")]
    [InlineData("US1")]
    public async Task Creating_WithAnInvalidCode_IsRefused(string code)
    {
        // Forwarded DataAnnotations are not enforced on this generated route — the hand-written validator's
        // Matches("^[A-Za-z]{3}$") rule is the only real guard, hence this test.
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, CurrenciesPath, new
        {
            code,
            name = "Bad code",
            decimalPlaces = 2
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.GetProperty("field").GetString() == "Code")
            .ShouldBeTrue($"expected a 'Code' field error, got: {body}");
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(5)]
    public async Task Creating_WithDecimalPlacesOutOfRange_IsRefused(int decimalPlaces)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, CurrenciesPath, new
        {
            code = NextCode(),
            name = "Bad precision",
            decimalPlaces
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.GetProperty("field").GetString() == "DecimalPlaces")
            .ShouldBeTrue($"expected a 'DecimalPlaces' field error, got: {body}");
    }

    // ---- Rename / Activate / Deactivate / List ----------------------------

    [Fact]
    public async Task Renaming_ChangesNameOnly_CodeAndDecimalPlacesUnchanged()
    {
        var code = NextCode();
        var id = await CreateCurrencyAsync(code, "Original Name", decimalPlaces: 3);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Put, $"{CurrenciesPath}/{id}", new { name = "Renamed" }));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("name").GetString().ShouldBe("Renamed");
        body.GetProperty("code").GetString().ShouldBe(code);
        body.GetProperty("decimalPlaces").GetInt32().ShouldBe(3);
    }

    [Fact]
    public async Task DeactivatingThenActivating_IsActiveRoundTrips()
    {
        var id = await CreateCurrencyAsync();

        var deactivated = await DeactivateAsync(id);
        deactivated.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await deactivated.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("isActive").GetBoolean().ShouldBeFalse();

        var reactivated = await ActivateAsync(id);
        reactivated.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await reactivated.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("isActive").GetBoolean().ShouldBeTrue();
    }

    [Fact]
    public async Task List_StillIncludesADeactivatedCurrency()
    {
        var code = NextCode();
        var id = await CreateCurrencyAsync(code);
        (await DeactivateAsync(id)).EnsureSuccessStatusCode();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Get, CurrenciesPath));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var items = doc.RootElement.GetProperty("items").EnumerateArray().ToList();
        var listed = items.SingleOrDefault(i => i.GetProperty("code").GetString() == code);
        listed.ValueKind.ShouldNotBe(JsonValueKind.Undefined, $"expected {code} to still be listed, got: {doc.RootElement}");
        listed.GetProperty("isActive").GetBoolean().ShouldBeFalse();
    }

    // ---- IsActive-driven refusals on Accounts/Postings ---------------------

    [Fact]
    public async Task OpeningAnAccount_InADeactivatedCurrency_IsRefused()
    {
        var code = await CreateDeactivatedCurrencyAsync();

        var response = await OpenAccountAsync(code);

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.UnsupportedCurrency)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.UnsupportedCurrency}, got: {body}");
    }

    [Fact]
    public async Task RecordingAPosting_InADeactivatedCurrency_IsRefused()
    {
        var accountId = await OpenSgdAccountAsync();
        var deactivatedCode = await CreateDeactivatedCurrencyAsync();

        var response = await RecordAsync(accountId, deactivatedCode);

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.UnsupportedCurrency)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.UnsupportedCurrency}, got: {body}");
    }

    [Fact]
    public async Task OpeningAnAccount_InAnUnknownCurrency_IsRefused()
    {
        var response = await OpenAccountAsync("XYZ");

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.UnsupportedCurrency)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.UnsupportedCurrency}, got: {body}");
    }

    // ---- Lowercase currency code regression --------------------------------

    /// <summary>
    /// Regression: before this feature, currency codes were compared case-sensitively, so a lowercase
    /// "sgd" was refused as unsupported even though SGD is seeded and active.
    /// </summary>
    [Fact]
    public async Task OpeningAnAccount_WithALowercaseCurrencyCode_Succeeds()
    {
        var response = await OpenAccountAsync("sgd");

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    /// <summary>Regression: same lowercase-comparison bug as <see cref="OpeningAnAccount_WithALowercaseCurrencyCode_Succeeds"/>, for the posting path.</summary>
    [Fact]
    public async Task RecordingAPosting_WithALowercaseCurrencyCode_Succeeds()
    {
        var accountId = await OpenSgdAccountAsync();

        var response = await RecordAsync(accountId, "sgd");

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    // ---- Batch path ---------------------------------------------------------

    [Fact]
    public async Task RecordBatch_WithADeactivatedCurrencyInOneMovement_RefusesTheWholeBatch()
    {
        var accountId = await OpenSgdAccountAsync();
        var deactivatedCode = await CreateDeactivatedCurrencyAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId, direction = "Credit", amount = 10m, currency = "SGD", category = "Transfer" },
                new { accountId, direction = "Credit", amount = 10m, currency = deactivatedCode, category = "Transfer" }
            }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.UnsupportedCurrency)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.UnsupportedCurrency}, got: {body}");
    }
}

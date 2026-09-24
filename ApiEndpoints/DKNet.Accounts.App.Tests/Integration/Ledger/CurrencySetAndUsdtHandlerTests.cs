using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Accounts.V1.Actions;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.AppServices.Share;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// DRK-1719 branches the §5 acceptance scenarios do not reach: a replay of a pre-change posting whose amount
/// had a trailing zero (the pre-upgrade scenario replays 10.5, where the old and new signatures coincide), the
/// same for a batch, a group holding a fiat and a USDT account, the limit rules on the member/route pairs the
/// scenarios leave out, and a currency registered after the decimal-places cache was first filled.
/// </summary>
public sealed class CurrencySetAndUsdtHandlerTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";
    private const string CallingSystem = "PayHub";

    private HttpClient Client => fixture.CreateClient();

    private static HttpRequestMessage AsPayHub(HttpMethod method, string uri, object? body = null, string? idempotencyKey = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, CallingSystem);
        request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', ScopeNames.All));
        if (idempotencyKey is not null)
        {
            request.Headers.Add("Idempotency-Key", idempotencyKey);
        }

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    private async Task<JsonElement> SendOkAsync(HttpMethod method, string uri, object? body = null)
    {
        var response = await Client.SendAsync(AsPayHub(method, uri, body));
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        response.IsSuccessStatusCode.ShouldBeTrue(json.ToString());
        return json;
    }

    private async Task<Guid> CreateGroupAsync() =>
        (await SendOkAsync(HttpMethod.Post, "/v1/account-groups", new
        {
            code = $"G{Guid.NewGuid():N}"[..5].ToUpperInvariant(),
            name = "Fixture Group",
            type = "Customer",
            ownerId = CallingSystem
        })).GetProperty("id").GetGuid();

    private async Task<Guid> OpenAccountAsync(string currency, Guid? groupId = null) =>
        (await SendOkAsync(HttpMethod.Post, AccountsPath, new
        {
            groupId = groupId ?? await CreateGroupAsync(),
            name = "Operating",
            currency,
            classification = "Liability",
            permittedToGoNegative = false
        })).GetProperty("id").GetGuid();

    private Task<JsonElement> CreditAsync(Guid accountId, decimal amount, string currency) =>
        SendOkAsync(HttpMethod.Post, PostingsPath, new { accountId, direction = "Credit", amount, currency, category = "Transfer" });

    /// <summary>A posting row written the way the service wrote it before DRK-1719: the as-written signature.</summary>
    private async Task<Guid> InsertPreChangePostingAsync(
        Guid accountId, decimal amount, string key, string signature, Guid? transactionGroupId = null)
    {
        using var scope = fixture.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var posting = new Posting(
            accountId, $"PRE-{Guid.NewGuid():N}"[..14], 1, PostingDirection.Credit, amount, "SGD", amount, amount,
            DateOnly.FromDateTime(DateTime.UtcNow), DateTimeOffset.UtcNow, PostingCategory.Transfer, transactionGroupId,
            null, null, CallingSystem, key, signature, null, null, null);
        // No request here to stamp the audit fields from — set the way TestApiFactoryBase seeds currencies.
        db.Add(posting).Property("CreatedBy").CurrentValue = CallingSystem;
        await db.SaveChangesAsync();
        return posting.Id;
    }

    [Fact]
    public async Task APreChangePostingWithATrailingZero_IsReplayed_WhenResentExactly()
    {
        var accountId = await OpenAccountAsync("SGD");
        var key = $"pay-{Guid.NewGuid():N}";
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var postingId = await InsertPreChangePostingAsync(accountId, 10.50m, key, PostingSignature.ComputeAsWritten(
            accountId, PostingDirection.Credit, 10.50m, "SGD", PostingCategory.Transfer, today, null, null, null, null, null));

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId, direction = "Credit", amount = 10.50m, currency = "SGD", category = "Transfer", effectiveDate = today
        }, key));

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body.ToString());
        body.GetProperty("id").GetGuid().ShouldBe(postingId);
    }

    [Fact]
    public async Task APreChangeBatchWithATrailingZero_IsReplayed_WhenResentExactly()
    {
        var accountId = await OpenAccountAsync("SGD");
        var key = $"batch-{Guid.NewGuid():N}";
        var today = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1);
        var legSignature = PostingSignature.ComputeAsWritten(
            accountId, PostingDirection.Credit, 10.50m, "SGD", PostingCategory.Transfer, today, null, null, null, null, null);
        var postingId = await InsertPreChangePostingAsync(
            accountId, 10.50m, key, PostingSignature.Hash(legSignature), transactionGroupId: Guid.NewGuid());

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new[]
            {
                new { accountId, direction = "Credit", amount = 10.50m, currency = "SGD", category = "Transfer", effectiveDate = today }
            }
        }, key));

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body.ToString());
        body.EnumerateArray().Select(p => p.GetProperty("id").GetGuid()).ShouldBe([postingId]);
    }

    [Fact]
    public async Task ABatchResentWithTrailingZeros_IsReplayed()
    {
        var accountId = await OpenAccountAsync("SGD");
        var key = $"batch-{Guid.NewGuid():N}";
        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1);
        object Batch(decimal amount) => new
        {
            movements = new[] { new { accountId, direction = "Credit", amount, currency = "SGD", category = "Transfer", effectiveDate = yesterday } }
        };

        var first = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", Batch(10.5m), key));
        first.StatusCode.ShouldBe(HttpStatusCode.Created, await first.Content.ReadAsStringAsync());
        var again = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", Batch(10.50m), key));

        again.StatusCode.ShouldBe(HttpStatusCode.OK, await again.Content.ReadAsStringAsync());
        (await SendOkAsync(HttpMethod.Get, $"{AccountsPath}/{accountId}/balance")).GetProperty("balance").GetRawText().ShouldBe("10.50");
    }

    [Fact]
    public async Task ABatchResentWithAnotherEffectiveDate_IsAConflict()
    {
        var accountId = await OpenAccountAsync("SGD");
        var key = $"batch-{Guid.NewGuid():N}";
        object Batch(int daysAgo) => new
        {
            movements = new[]
            {
                new
                {
                    accountId, direction = "Credit", amount = 10.5m, currency = "SGD", category = "Transfer",
                    effectiveDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-daysAgo)
                }
            }
        };

        (await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", Batch(1), key))).EnsureSuccessStatusCode();
        var again = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", Batch(2), key));

        again.StatusCode.ShouldBe(HttpStatusCode.Conflict, await again.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ATenLetterCurrency_CanBeHeldPostedAndBatched()
    {
        var code = "TEN" + new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Concat("ABCDEFG").Take(7).ToArray()).ToUpperInvariant();
        await SendOkAsync(HttpMethod.Post, "/v1/currencies", new { code, name = "Ten Letters", decimalPlaces = 0 });
        var accountId = await OpenAccountAsync(code);

        await CreditAsync(accountId, 5m, code);
        await SendOkAsync(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new[] { new { accountId, direction = "Credit", amount = 1m, currency = code, category = "Transfer" } }
        });

        (await SendOkAsync(HttpMethod.Get, $"{AccountsPath}/{accountId}/balance")).GetProperty("balance").GetRawText().ShouldBe("6");
    }

    [Theory]
    [InlineData("AB")]
    [InlineData("ELEVENCHARS")]
    public async Task ACurrencyCodeOutsideThreeToTenCharacters_IsRefusedOnEveryWrite(string code)
    {
        var accountId = await OpenAccountAsync("SGD");

        var open = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = await CreateGroupAsync(), name = "Operating", currency = code, classification = "Liability"
        }));
        var record = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId, direction = "Credit", amount = 1m, currency = code, category = "Transfer"
        }));
        var batch = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new[] { new { accountId, direction = "Credit", amount = 1m, currency = code, category = "Transfer" } }
        }));

        open.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        record.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        batch.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AGroupHoldingSgdAndUsdt_ListsUsdtAsItsOwnLine()
    {
        var groupId = await CreateGroupAsync();
        await CreditAsync(await OpenAccountAsync("SGD", groupId), 12400m, "SGD");
        await CreditAsync(await OpenAccountAsync("USDT", groupId), 1.5m, "USDT");

        var lines = (await SendOkAsync(HttpMethod.Get, $"/v1/account-groups/{groupId}/balances"))
            .EnumerateArray()
            .ToDictionary(l => l.GetProperty("currency").GetString()!, l => l.GetProperty("balance").GetRawText());

        lines.ShouldBe(new Dictionary<string, string> { ["SGD"] = "12400.00", ["USDT"] = "1.500000" }, ignoreOrder: true);
    }

    [Fact]
    public async Task AStatementAndItsPostings_AreWrittenAtTheCurrencysDecimalPlaces()
    {
        var accountId = await OpenAccountAsync("USDT");
        var posting = await CreditAsync(accountId, 2.5m, "USDT");
        posting.GetProperty("amount").GetRawText().ShouldBe("2.500000");

        var statement = await SendOkAsync(HttpMethod.Get, $"{AccountsPath}/{accountId}/statement");

        statement.GetProperty("items").EnumerateArray().Single().GetProperty("balanceAfter").GetRawText().ShouldBe("2.500000");
    }

    [Fact]
    public async Task ACurrencyRegisteredAfterTheCacheWasFilled_IsWrittenAtItsOwnPlaces()
    {
        // Fill the cache first, then register a currency it cannot yet know.
        await CreditAsync(await OpenAccountAsync("SGD"), 1m, "SGD");
        var code = "TST" + new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(4).ToArray()).ToUpperInvariant();
        await SendOkAsync(HttpMethod.Post, "/v1/currencies", new { code, name = "Test Dinar", decimalPlaces = 3 });

        // The very first response naming the new code is the one that has to miss the cache and reload it.
        var account = await SendOkAsync(HttpMethod.Post, AccountsPath, new
        {
            groupId = await CreateGroupAsync(), name = "Operating", currency = code, classification = "Liability"
        });
        account.GetProperty("balance").GetRawText().ShouldBe("0.000");

        var posting = await CreditAsync(account.GetProperty("id").GetGuid(), 1.5m, code);
        posting.GetProperty("amount").GetRawText().ShouldBe("1.500");
    }

    [Fact]
    public async Task ACurrencyRegisteredAfterTheCacheWasFilled_IsFoundOnItsFirstLookup()
    {
        var places = fixture.Services.GetRequiredService<CurrencyDecimalPlaces>();
        places.Of("SGD").ShouldBe(2);
        var code = "NEW" + new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(4).ToArray()).ToUpperInvariant();
        await SendOkAsync(HttpMethod.Post, "/v1/currencies", new { code, name = "Test Dinar", decimalPlaces = 3 });

        places.Of(code).ShouldBe(3);
    }

    [Fact]
    public void AnUnknownCurrency_HasNoDecimalPlaces() =>
        fixture.Services.GetRequiredService<CurrencyDecimalPlaces>().Of("NOSUCHCODE").ShouldBeNull();

    [Theory]
    [InlineData("overdraftLimit", "OverdraftLimit")]
    [InlineData("minimumBalance", "MinimumBalance")]
    public async Task OpeningWithALimitFinerThanTheCurrency_IsRefusedNamingTheField(string member, string field)
    {
        var body = new Dictionary<string, object?>
        {
            ["groupId"] = await CreateGroupAsync(), ["name"] = "Operating", ["currency"] = "JPY",
            ["classification"] = "Liability", ["permittedToGoNegative"] = true, ["overdraftLimit"] = 100m
        };
        body[member] = 10.5m;

        await ShouldBeRefusedAsync(await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, body)),
            LedgerErrors.InvalidLimitAmount, field);
    }

    [Theory]
    [InlineData("overdraftLimit", "10.123", "INVALID_LIMIT_AMOUNT", "OverdraftLimit")]
    [InlineData("minimumBalance", "10.123", "INVALID_LIMIT_AMOUNT", "MinimumBalance")]
    [InlineData("minimumBalance", "1000000000000", "AMOUNT_OUT_OF_RANGE", "MinimumBalance")]
    public async Task PatchingALimit_IsRefusedNamingTheField(string member, string amount, string code, string field)
    {
        var accountId = await OpenAccountAsync("SGD");

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Patch, $"{AccountsPath}/{accountId}",
            new Dictionary<string, object> { [member] = decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture) }));

        await ShouldBeRefusedAsync(response, code, field);
        (await SendOkAsync(HttpMethod.Get, $"{AccountsPath}/{accountId}")).TryGetProperty(member, out _).ShouldBeFalse();
    }

    [Fact]
    public async Task PatchingALimitAtTheCurrencysPlaces_IsAccepted()
    {
        var accountId = await OpenAccountAsync("SGD");

        var account = await SendOkAsync(HttpMethod.Patch, $"{AccountsPath}/{accountId}", new { minimumBalance = 10.1m });

        account.GetProperty("minimumBalance").GetRawText().ShouldBe("10.10");
    }

    [Fact]
    public async Task PatchingALimitOnAnUnknownAccount_IsNotFound()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Patch, $"{AccountsPath}/{Guid.NewGuid()}", new { minimumBalance = 10.123m }));

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task OpeningInAnUnknownCurrencyWithALimit_IsRefusedAsAnUnsupportedCurrency()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = await CreateGroupAsync(), name = "Operating", currency = "NOSUCHCODE",
            classification = "Liability", minimumBalance = 10.123m
        }));

        await ShouldBeRefusedAsync(response, LedgerErrors.UnsupportedCurrency, field: null);
    }

    [Fact]
    public async Task OpeningWithNoCurrencyAndALimit_IsRefusedForTheCurrencyAlone()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = await CreateGroupAsync(), name = "Operating",
            classification = "Liability", minimumBalance = 10.123m
        }));

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest, body.ToString());
        body.GetProperty("errors").EnumerateArray().Select(e => e.GetProperty("field").GetString()).ShouldAllBe(f => f == "Currency");
    }

    [Fact]
    public async Task TheUpdateValidator_ReadsTheAccountFromTheRequest_WhenItCarriesOne()
    {
        var accountId = await OpenAccountAsync("SGD");
        using var scope = fixture.CreateScope();
        var validator = scope.ServiceProvider.GetRequiredService<FluentValidation.IValidator<UpdateAccountRequest>>();

        var withId = await validator.ValidateAsync(new UpdateAccountRequest { Id = accountId, MinimumBalance = 10.123m });
        var withoutId = await validator.ValidateAsync(new UpdateAccountRequest { MinimumBalance = 10.123m });

        withId.Errors.ShouldHaveSingleItem().ErrorCode.ShouldBe(LedgerErrors.InvalidLimitAmount);
        withoutId.IsValid.ShouldBeTrue();
    }

    private static async Task ShouldBeRefusedAsync(HttpResponseMessage response, string code, string? field)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity, body.ToString());
        var error = body.GetProperty("errors").EnumerateArray().ShouldHaveSingleItem();
        error.GetProperty("code").GetString().ShouldBe(code);
        if (field is not null)
        {
            error.GetProperty("field").GetString().ShouldBe(field);
        }
    }
}

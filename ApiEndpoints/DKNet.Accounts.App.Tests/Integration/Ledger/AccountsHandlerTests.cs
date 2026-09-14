using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Share;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// Covers Account Update handler branches the BDD acceptance scenarios don't reach: renaming, changing the
/// overdraft limit/minimum balance/metadata independently, reopening a closed account, and refusing to close
/// an account that genuinely holds a balance (set directly — postings are the next stage).
/// </summary>
public sealed class AccountsHandlerTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string AccountsPath = "/v1/accounts";

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

    private async Task<Guid> OpenAccountAsync(
        bool permittedToGoNegative = false, decimal? overdraftLimit = null, decimal? minimumBalance = null)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = Guid.NewGuid(),
            name = "Operating",
            currency = "SGD",
            classification = "Asset",
            permittedToGoNegative,
            overdraftLimit,
            minimumBalance
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task Rename_ChangesTheName()
    {
        var id = await OpenAccountAsync();

        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Patch, $"{AccountsPath}/{id}", new { name = "New Name" }));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("name").GetString().ShouldBe("New Name");
    }

    [Fact]
    public async Task ChangingOverdraftLimitAndMinimumBalance_AppliesBothIndependently()
    {
        var id = await OpenAccountAsync(permittedToGoNegative: true, overdraftLimit: 20m);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Patch, $"{AccountsPath}/{id}", new
        {
            overdraftLimit = 40m,
            minimumBalance = -10m
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("overdraftLimit").GetDecimal().ShouldBe(40m);
        body.GetProperty("minimumBalance").GetDecimal().ShouldBe(-10m);
    }

    [Fact]
    public async Task ChangingMetadata_ReplacesTheBag()
    {
        var id = await OpenAccountAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Patch, $"{AccountsPath}/{id}", new
        {
            metadata = new Dictionary<string, string> { ["region"] = "SG" }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("metadata").GetProperty("region").GetString().ShouldBe("SG");
    }

    [Fact]
    public async Task ClosingThenReopening_IsPermitted()
    {
        var id = await OpenAccountAsync();
        (await Client.SendAsync(AsPayHub(HttpMethod.Patch, $"{AccountsPath}/{id}", new { status = "Closed" })))
            .StatusCode.ShouldBe(HttpStatusCode.OK);

        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Patch, $"{AccountsPath}/{id}", new { status = "Active" }));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("status").GetString().ShouldBe("active");
    }

    [Fact]
    public async Task Update_ReturnsNotFound_ForAnUnknownAccount()
    {
        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Patch, $"{AccountsPath}/{Guid.NewGuid()}", new { name = "x" }));

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ClosingAnAccountThatReallyHoldsABalance_IsRefused()
    {
        var id = await OpenAccountAsync();

        // Postings are the next stage — there is no API path to a non-zero balance yet, so the balance is set
        // directly on the tracked entity to prove this handler's guard actually fires when it can be reached.
        using (var scope = fixture.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
            var account = await dbContext.Set<Account>().SingleAsync(a => a.Id == id);
            typeof(Account).GetProperty(nameof(Account.Balance))!.SetValue(account, 25.00m);
            await dbContext.SaveChangesAsync();
        }

        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Patch, $"{AccountsPath}/{id}", new { status = "Closed" }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.AccountHoldsBalance);
    }

    [Fact]
    public async Task Opening_WithAnUnsupportedCurrency_IsRefused()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = Guid.NewGuid(),
            name = "Operating",
            currency = "XXX",
            classification = "Asset",
            permittedToGoNegative = false
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.UnsupportedCurrency);
    }
}

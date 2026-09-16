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
/// Covers AccountGroups Create/Update handler branches the BDD acceptance scenarios don't reach: duplicate
/// group code, get-by-id (found and not-found), and closing a group whose account genuinely holds a balance
/// (set directly on the tracked entity — postings are the next stage, so there is no API path to a non-zero
/// balance yet; see <see cref="Account"/> tests for the entity-level guard).
/// </summary>
public sealed class AccountGroupsHandlerTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string GroupsPath = "/v1/account-groups";

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

    private async Task<Guid> CreateGroupAsync(string code)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, GroupsPath, new
        {
            code,
            name = code,
            type = "Customer",
            ownerId = "PayHub"
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task CreatingAGroupWithADuplicateCode_IsRefused()
    {
        var code = $"DUP-{Guid.NewGuid():N}";
        await CreateGroupAsync(code);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, GroupsPath, new
        {
            code,
            name = "Another name",
            type = "Customer",
            ownerId = "PayHub"
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.DuplicateGroupCode);
    }

    [Fact]
    public async Task ChangingMetadata_RoundTripsKeysVerbatim()
    {
        // Regression: global Mapster NameMatchingStrategy.Flexible re-cased plain dictionary keys as if they
        // were member names ("region" -> "Region") — see the matching Account-level test for the root cause.
        var id = await CreateGroupAsync($"MD-{Guid.NewGuid():N}");

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Put, $"{GroupsPath}/{id}/change-metadata", new
        {
            metadata = new Dictionary<string, string> { ["region"] = "SG" }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("metadata").GetProperty("region").GetString().ShouldBe("SG");
    }

    [Fact]
    public async Task GetById_ReturnsTheGroup_WhenItExists()
    {
        var code = $"GET-{Guid.NewGuid():N}";
        var id = await CreateGroupAsync(code);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{GroupsPath}/{id}"));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(code);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenTheGroupDoesNotExist()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{GroupsPath}/{Guid.NewGuid()}"));

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// Rework finding 3: <c>GetAccountGroupBalances</c> had no test at all. Proves the group-by-currency
    /// projection — one line per currency, holding the real (postings-driven) balance, never a combined total
    /// across currencies.
    /// </summary>
    [Fact]
    public async Task Balances_AGroupHoldingTwoCurrencies_ReturnsTwoSeparateLinesAndNoCombinedTotal()
    {
        var groupId = await CreateGroupAsync($"BAL2-{Guid.NewGuid():N}");

        var sgdAccount = await OpenAccountInGroupAsync(groupId, "SGD");
        var usdAccount = await OpenAccountInGroupAsync(groupId, "USD");
        await RecordCreditAsync(sgdAccount, 100.00m, "SGD");
        await RecordCreditAsync(usdAccount, 80.00m, "USD");

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{GroupsPath}/{groupId}/balances"));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var lines = (await response.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToList();
        lines.Count.ShouldBe(2); // no third, combined/summed line
        lines.Single(l => l.GetProperty("currency").GetString() == "SGD")
            .GetProperty("balance").GetDecimal().ShouldBe(100.00m);
        lines.Single(l => l.GetProperty("currency").GetString() == "USD")
            .GetProperty("balance").GetDecimal().ShouldBe(80.00m);
    }

    private async Task<Guid> OpenAccountInGroupAsync(Guid groupId, string currency)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, "/v1/accounts", new
        {
            groupId,
            name = "Operating",
            currency,
            classification = "Liability",
            permittedToGoNegative = false
        }));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private async Task RecordCreditAsync(Guid accountId, decimal amount, string currency)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, "/v1/postings", new
        {
            accountId,
            direction = "Credit",
            amount,
            currency,
            category = "Transfer"
        }));
        response.EnsureSuccessStatusCode();
    }

    /// <summary>Nit 3: closes the remaining <c>UpdateAccountGroupCommandHandler</c> coverage gaps — a
    /// successful (no-balance) close and reactivation — plus the generated Rename/ChangeDescription routes
    /// (DRK-1277 §11/§12) — none reachable from the existing duplicate-code/close-with-balance tests or the
    /// BDD acceptance scenarios.</summary>
    [Fact]
    public async Task Updating_RenamesDescribesClosesAndReactivates_AllApply()
    {
        var groupId = await CreateGroupAsync($"UPD-{Guid.NewGuid():N}");

        var renamed = await Client.SendAsync(AsPayHub(HttpMethod.Put, $"{GroupsPath}/{groupId}", new
        {
            name = "Renamed Group"
        }));
        renamed.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await renamed.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("name").GetString().ShouldBe("Renamed Group");

        var described = await Client.SendAsync(AsPayHub(HttpMethod.Put, $"{GroupsPath}/{groupId}/change-description", new
        {
            description = "Updated description"
        }));
        described.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await described.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("description").GetString()
            .ShouldBe("Updated description");

        // No account holds a balance, so closing succeeds — the success path of the Closed branch.
        var closed = await Client.SendAsync(AsPayHub(HttpMethod.Patch, $"{GroupsPath}/{groupId}", new { status = "Closed" }));
        closed.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await closed.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString().ShouldBe("closed");

        // Reactivating exercises the non-Closed ("Activate") branch.
        var reactivated = await Client.SendAsync(AsPayHub(HttpMethod.Patch, $"{GroupsPath}/{groupId}", new { status = "Active" }));
        reactivated.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await reactivated.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString().ShouldBe("active");
    }

    [Fact]
    public async Task Updating_AnUnknownGroup_IsRefused()
    {
        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Patch, $"{GroupsPath}/{Guid.NewGuid()}", new { status = "Closed" }));

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Renaming_AnUnknownGroup_IsRefused()
    {
        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Put, $"{GroupsPath}/{Guid.NewGuid()}", new { name = "Doesn't matter" }));

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// DRK-1421 §3 row 7: <c>AddErrorResponses</c> is wired globally (row 3) for the GROUP_NOT_EMPTY refusal
    /// alone. Proves every OTHER validator refusal — one whose FluentValidation rule carries no
    /// <c>WithErrorCode</c> — still gets today's plain 400 validation-problem body, widened to 422 for none of
    /// them.
    /// </summary>
    [Fact]
    public async Task CreatingAGroupWithInvalidInput_StillAnswers400WithTodaysBody()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, GroupsPath, new
        {
            code = "",
            name = "Missing code",
            type = "Customer",
            ownerId = "PayHub"
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty(LedgerErrors.CodeKey, out _).ShouldBeFalse();
        body.GetProperty("errors").GetProperty("Code")[0].GetString().ShouldBe("'Code' must not be empty.");
    }

    [Fact]
    public async Task ClosingAGroupWhoseAccountReallyHoldsABalance_IsRefused()
    {
        var groupId = await CreateGroupAsync($"BAL-{Guid.NewGuid():N}");
        var accountResponse = await Client.SendAsync(AsPayHub(HttpMethod.Post, "/v1/accounts", new
        {
            groupId,
            name = "Operating",
            currency = "SGD",
            classification = "Asset",
            permittedToGoNegative = false
        }));
        accountResponse.EnsureSuccessStatusCode();
        var accountId = (await accountResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        // Postings are the next stage — there is no API path to a non-zero balance yet, so the balance is set
        // directly on the tracked entity to prove this handler's guard (which R: refuses closing a group
        // while any account it holds still carries a balance) actually fires when it can be reached.
        using (var scope = fixture.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
            var account = await dbContext.Set<Account>().SingleAsync(a => a.Id == accountId);
            typeof(Account).GetProperty(nameof(Account.Balance))!.SetValue(account, 25.00m);
            await dbContext.SaveChangesAsync();
        }

        var response = await Client.SendAsync(
            AsPayHub(HttpMethod.Patch, $"{GroupsPath}/{groupId}", new { status = "Closed" }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.GroupHoldsBalance);
    }
}

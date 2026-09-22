using System.Net.Http.Json;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for the console's status-count and balance-reporting routes (DRK-1659 §5, surface 2).
/// <c>GET /v1/accounts/status-counts</c>, <c>GET /v1/account-groups/status-counts</c> and
/// <c>GET /v1/accounts/balances</c> are not registered yet (§9 Q1/Q3, Build's job), so every scenario that
/// calls one of them is red because the request never reaches the intended handler — it either 404s or, for
/// the accounts group, falls through to the generated <c>{id}</c> read route's malformed-guid 400, per the
/// nameable reason R2 asks for. The already-published <c>{id}/balance</c> and <c>{id}/balances</c> routes are
/// red instead because their DTOs don't carry <c>floor</c>/<c>available</c>/<c>held</c> yet, which the
/// response-shape assertions below surface directly.
/// </summary>
[Binding]
public sealed class ConsoleReportingSteps(HttpClient client, ScenarioState state, BddApiFactory factory)
{
    private const string FeatureName = "Console read and edit routes — status counts and balances";
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    #region Shared helpers

    private async Task<Guid> CreateGroupAsync(string code)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code, name = code, type = "Customer", ownerId = state.CallerClientId
        });
        return (await TryReadIdAsync(response))!.Value;
    }

    private async Task<Guid> OpenAccountAsync(
        string currency,
        Guid? groupId = null,
        bool permittedToGoNegative = false,
        decimal? overdraftLimit = null,
        string name = "Console Test Account")
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId = groupId ?? await CreateGroupAsync($"G{Guid.NewGuid():N}"[..5].ToUpperInvariant()),
            name,
            currency,
            classification = "Liability",
            permittedToGoNegative,
            overdraftLimit
        });
        return (await TryReadIdAsync(response))!.Value;
    }

    private async Task PatchAccountStatusAsync(Guid accountId, string status) =>
        await client.SendAsCallerAsync(state, HttpMethod.Patch, $"{AccountsPath}/{accountId}", new { status });

    private async Task CloseGroupAsync(Guid groupId) =>
        await client.SendAsCallerAsync(state, HttpMethod.Post, $"{GroupsPath}/{groupId}/close");

    private async Task RecordPostingAsync(Guid accountId, decimal amount, string currency) =>
        await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId, direction = "Credit", amount, currency, category = "Transfer"
        });

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

    /// <summary>Type-per-status count, keyed case-insensitively — <c>GetStatusCounts</c> uppercases every
    /// status name (§2), and this test cares about the count, not that casing choice.</summary>
    private static async Task<Dictionary<string, int>> ReadStatusCountsAsync(HttpResponseMessage response)
    {
        var doc = await ReadJsonAsync(response);
        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var element in doc.EnumerateArray())
        {
            counts[element.GetProperty("status").GetString()!] = element.GetProperty("count").GetInt32();
        }

        return counts;
    }

    private readonly record struct BalanceLine(decimal Balance, decimal Available, decimal Held);

    private static async Task<Dictionary<string, BalanceLine>> ReadBalanceLinesAsync(HttpResponseMessage response)
    {
        var doc = await ReadJsonAsync(response);
        var lines = new Dictionary<string, BalanceLine>(StringComparer.OrdinalIgnoreCase);
        foreach (var element in doc.EnumerateArray())
        {
            lines[element.GetProperty("currency").GetString()!] = new BalanceLine(
                element.GetProperty("balance").GetDecimal(),
                element.GetProperty("available").GetDecimal(),
                element.GetProperty("held").GetDecimal());
        }

        return lines;
    }

    /// <summary>Backdates an account's CreatedOn column directly via SQL — there is no API to set it (opening
    /// is always "now"), the same no-new-seam reasoning and mechanism as
    /// AttributeCrudMigrationSteps.BackdateGroupCreatedOnAsync, applied to the Account table instead.</summary>
    private async Task BackdateAccountCreatedOnAsync(Guid accountId, DateTimeOffset createdOn)
    {
        using var scope = factory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var entityType = db.Model.FindEntityType(typeof(Account))!;
        var table = $"\"{entityType.GetSchema() ?? "public"}\".\"{entityType.GetTableName()}\"";
        // Table/schema names come from EF metadata, not user input — safe to splice into the SQL text.
        // The two data values still go through provider parameters via ExecuteSqlRaw's {0}/{1} placeholders.
        await db.Database.ExecuteSqlRawAsync(
            $"UPDATE {table} SET \"CreatedOn\" = {{0}} WHERE \"Id\" = {{1}}", createdOn, accountId);
    }

    #endregion

    #region Given

    [Given(@"the ledger holds (\d+) active accounts?, (\d+) frozen accounts? and no dormant account")]
    public async Task GivenTheLedgerHoldsActiveAccountsFrozenAccountsAndNoDormantAccount(int activeCount, int frozenCount)
    {
        for (var i = 0; i < activeCount; i++)
        {
            await OpenAccountAsync("SGD");
        }

        for (var i = 0; i < frozenCount; i++)
        {
            var accountId = await OpenAccountAsync("SGD");
            await PatchAccountStatusAsync(accountId, "Frozen");
        }
    }

    [Given(@"the ledger holds (\d+) active groups? and (\d+) closed groups?")]
    public async Task GivenTheLedgerHoldsActiveGroupsAndClosedGroups(int activeCount, int closedCount)
    {
        for (var i = 0; i < activeCount; i++)
        {
            await CreateGroupAsync($"A{Guid.NewGuid():N}"[..5].ToUpperInvariant());
        }

        for (var i = 0; i < closedCount; i++)
        {
            var groupId = await CreateGroupAsync($"C{Guid.NewGuid():N}"[..5].ToUpperInvariant());
            await CloseGroupAsync(groupId);
        }
    }

    [Given(@"(\d+) accounts were opened in August 2026 and (\d+) active accounts were opened in September 2026")]
    public async Task GivenAccountsWereOpenedInAugustAndSeptember2026(int augustCount, int septemberCount)
    {
        for (var i = 0; i < augustCount; i++)
        {
            var accountId = await OpenAccountAsync("SGD");
            await BackdateAccountCreatedOnAsync(accountId, new DateTimeOffset(2026, 8, 15, 0, 0, 0, TimeSpan.Zero));
        }

        for (var i = 0; i < septemberCount; i++)
        {
            var accountId = await OpenAccountAsync("SGD");
            await BackdateAccountCreatedOnAsync(accountId, new DateTimeOffset(2026, 9, 15, 0, 0, 0, TimeSpan.Zero));
        }
    }

    [Given(@"accounts in two different groups hold 100\.00 SGD, 50\.00 SGD and 20\.00 USD")]
    public async Task GivenAccountsInTwoDifferentGroupsHoldBalances()
    {
        var group1 = await CreateGroupAsync($"L{Guid.NewGuid():N}"[..5].ToUpperInvariant());
        var group2 = await CreateGroupAsync($"L{Guid.NewGuid():N}"[..5].ToUpperInvariant());

        var account1 = await OpenAccountAsync("SGD", group1);
        await RecordPostingAsync(account1, 100.00m, "SGD");

        var account2 = await OpenAccountAsync("SGD", group2);
        await RecordPostingAsync(account2, 50.00m, "SGD");

        var account3 = await OpenAccountAsync("USD", group2);
        await RecordPostingAsync(account3, 20.00m, "USD");
    }

    [Given(@"an account group holds 100\.00 SGD across its accounts")]
    public async Task GivenAnAccountGroupHolds100SgdAcrossItsAccounts()
    {
        var groupId = await CreateGroupAsync($"H{Guid.NewGuid():N}"[..5].ToUpperInvariant());
        state.Values["group"] = groupId.ToString();

        var account1 = await OpenAccountAsync("SGD", groupId);
        await RecordPostingAsync(account1, 60.00m, "SGD");

        var account2 = await OpenAccountAsync("SGD", groupId);
        await RecordPostingAsync(account2, 40.00m, "SGD");
    }

    [Given(@"the ""ACME"" account is permitted to go negative up to 500\.00 SGD")]
    public async Task GivenTheAcmeAccountIsPermittedToGoNegativeUpTo500Sgd()
    {
        var accountId = await OpenAccountAsync("SGD", permittedToGoNegative: true, overdraftLimit: 500.00m, name: "ACME");
        state.Values["account"] = accountId.ToString();
    }

    #endregion

    #region When

    [When(@"treasury-ops asks how many accounts sit in each status$")]
    public async Task WhenTreasuryOpsAsksHowManyAccountsSitInEachStatus() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/status-counts");

    [When(@"treasury-ops asks how many account groups sit in each status")]
    public async Task WhenTreasuryOpsAsksHowManyAccountGroupsSitInEachStatus() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/status-counts");

    [When(@"treasury-ops asks how many accounts sit in each status, for September 2026 only")]
    public async Task WhenTreasuryOpsAsksHowManyAccountsSitInEachStatusForSeptember2026Only() =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get,
            $"{AccountsPath}/status-counts?from=2026-09-01T00:00:00Z&to=2026-09-30T23:59:59Z");

    [When(@"treasury-ops asks how many accounts sit in each status, narrowed by currency")]
    public async Task WhenTreasuryOpsAsksHowManyAccountsSitInEachStatusNarrowedByCurrency() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/status-counts?currency=SGD");

    [When(@"treasury-ops asks for the ledger's balances by currency")]
    public async Task WhenTreasuryOpsAsksForTheLedgersBalancesByCurrency() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/balances");

    [When(@"treasury-ops asks for that group's balances by currency")]
    public async Task WhenTreasuryOpsAsksForThatGroupsBalancesByCurrency()
    {
        var groupId = state.Values["group"];
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{groupId}/balances");
    }

    [When(@"treasury-ops reads that account's balance")]
    public async Task WhenTreasuryOpsReadsThatAccountsBalance()
    {
        var accountId = state.Values["account"];
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{accountId}/balance");
    }

    #endregion

    #region Then

    [Then(@"the answer reads 4 active, 1 frozen, 0 dormant and 0 closed")]
    public async Task ThenTheAnswerReads4Active1Frozen0Dormant0Closed()
    {
        var counts = await ReadStatusCountsAsync(state.Response!);
        counts.GetValueOrDefault("ACTIVE").ShouldBe(4);
        counts.GetValueOrDefault("FROZEN").ShouldBe(1);
        counts.GetValueOrDefault("DORMANT").ShouldBe(0);
        counts.GetValueOrDefault("CLOSED").ShouldBe(0);
    }

    [Then(@"the answer reads 2 active and 1 closed")]
    public async Task ThenTheAnswerReads2ActiveAnd1Closed()
    {
        var counts = await ReadStatusCountsAsync(state.Response!);
        counts.GetValueOrDefault("ACTIVE").ShouldBe(2);
        counts.GetValueOrDefault("CLOSED").ShouldBe(1);
    }

    [Then(@"the answer reads 2 active accounts")]
    public async Task ThenTheAnswerReads2ActiveAccounts()
    {
        var counts = await ReadStatusCountsAsync(state.Response!);
        counts.GetValueOrDefault("ACTIVE").ShouldBe(2);
    }

    [Then(@"the August accounts are not counted")]
    public async Task ThenTheAugustAccountsAreNotCounted()
    {
        var counts = await ReadStatusCountsAsync(state.Response!);
        counts.Values.Sum().ShouldBe(2, "accounts created outside the requested window must be excluded");
    }

    // Reqnroll matches the whole line against LedgerSteps.ThenTheRequestIsRefused's catch-all
    // ("the request is refused(?! with status)(?:.*)"), which this scenario's Then line also matches — the
    // [Scope] restricts this binding to this feature so Reqnroll doesn't report both as ambiguous
    // (PostingsListingSteps.cs's own status-refusal Then steps use the same fix). A plain 400 alone would
    // pass by accident today: the route isn't registered, so the request falls through to the generated
    // accounts `{id}` read route, which already answers a malformed id ("status-counts") with 400 — asserting
    // the error shape too (this repo's own business refusals are an `errors` array of {code,...}, never the
    // ASP.NET model-binding failure's `errors` object) keeps the scenario red until the real refusal exists.
    [Then(@"the request is refused because that narrowing is not offered")]
    [Scope(Feature = FeatureName)]
    public async Task ThenTheRequestIsRefusedBecauseThatNarrowingIsNotOffered()
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("errors").ValueKind.ShouldBe(JsonValueKind.Array);
    }

    [Then(@"the answer reads 150\.00 SGD on one line and 20\.00 USD on another")]
    public async Task ThenTheAnswerReads150SgdOnOneLineAnd20UsdOnAnother()
    {
        var lines = await ReadBalanceLinesAsync(state.Response!);
        lines["SGD"].Balance.ShouldBe(150.00m);
        lines["USD"].Balance.ShouldBe(20.00m);
    }

    [Then(@"each line also states its available amount and its held amount")]
    public async Task ThenEachLineAlsoStatesItsAvailableAmountAndItsHeldAmount()
    {
        var lines = await ReadBalanceLinesAsync(state.Response!);
        lines["SGD"].Available.ShouldBe(150.00m);
        lines["SGD"].Held.ShouldBe(0.00m);
        lines["USD"].Available.ShouldBe(20.00m);
        lines["USD"].Held.ShouldBe(0.00m);
    }

    [Then(@"no line combines the two currencies")]
    public async Task ThenNoLineCombinesTheTwoCurrencies()
    {
        var lines = await ReadBalanceLinesAsync(state.Response!);
        lines.Count.ShouldBe(2);
    }

    [Then(@"the SGD line states a balance of 100\.00, an available amount of 100\.00 and a held amount of 0\.00")]
    public async Task ThenTheSgdLineStatesABalanceOf100AnAvailableAmountOf100AndAHeldAmountOf0()
    {
        var lines = await ReadBalanceLinesAsync(state.Response!);
        lines["SGD"].Balance.ShouldBe(100.00m);
        lines["SGD"].Available.ShouldBe(100.00m);
        lines["SGD"].Held.ShouldBe(0.00m);
    }

    [Then(@"the answer states a floor of -500\.00 SGD")]
    public async Task ThenTheAnswerStatesAFloorOfMinus50000Sgd()
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("floor").GetDecimal().ShouldBe(-500.00m);
    }

    #endregion
}

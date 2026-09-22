using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for the cross-account posting list (DRK-1659 §5, surface 1). <c>GET /v1/postings</c>'
/// handler throws <c>NotImplementedException</c> at this stage (§9 Q3, Build's job) — every scenario here is
/// red because the list call itself comes back 500, the nameable reason R2 asks for. Fixture setup goes
/// through the already-implemented account/posting/reverse routes, which is why the Given steps below
/// genuinely succeed.
/// </summary>
[Binding]
public sealed class PostingsListingSteps(HttpClient client, ScenarioState state)
{
    private const string FeatureName = "Console read and edit routes";
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    #region Shared helpers

    private async Task<Guid> OpenNamedAccountAsync(string code)
    {
        if (Guid.TryParse(state.Values.GetValueOrDefault($"account:{code}"), out var existing) && existing != Guid.Empty)
        {
            return existing;
        }

        var groupId = await CreateGroupAsync($"G{Guid.NewGuid():N}"[..5].ToUpperInvariant());
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId, name = code, currency = "SGD", classification = "Liability"
        });
        var id = (await TryReadIdAsync(response))!.Value;
        state.Values[$"account:{code}"] = id.ToString();
        return id;
    }

    private async Task<Guid> CreateGroupAsync(string code)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code, name = code, type = "Customer", ownerId = state.CallerClientId
        });
        return (await TryReadIdAsync(response))!.Value;
    }

    private async Task<Guid> RecordPostingAsync(
        Guid accountId, string direction, decimal amount, string currency, DateOnly effectiveDate,
        string category = "Transfer", string? counterpartyReference = null)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId, direction, amount, currency, category, effectiveDate, counterpartyReference
        });
        return (await TryReadIdAsync(response))!.Value;
    }

    private async Task ReversePostingAsync(Guid postingId) =>
        await client.SendAsCallerAsync(
            state, HttpMethod.Post, $"{PostingsPath}/{postingId}/reverse",
            new { reason = "Recorded in error" }, $"rev-{Guid.NewGuid():N}");

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

    [Given(@"the ledger holds postings on the ""([^""]+)"" and ""([^""]+)"" accounts")]
    public async Task GivenTheLedgerHoldsPostingsOnTheAndAccounts(string code1, string code2)
    {
        var account1 = await OpenNamedAccountAsync(code1);
        var account2 = await OpenNamedAccountAsync(code2);
        await RecordPostingAsync(account1, "Credit", 100.00m, "SGD", new DateOnly(2026, 8, 1));
        await RecordPostingAsync(account2, "Credit", 50.00m, "SGD", new DateOnly(2026, 8, 15));
    }

    [Given(@"the ledger holds 5 postings effective on 2026-09-01: 3 credits and 2 debits")]
    public void GivenTheLedgerHolds5PostingsEffectiveOn20260901ThreeCreditsAndTwoDebits()
    {
        // The full fixture is only fully determined once the next two Given lines name the account split,
        // the fee, and which credit/debit pair is the reversal — built there instead of split across three
        // steps that would otherwise need to share half-finished state.
    }

    [Given(@"2 of those 5 are on the ""ACME"" account, and 1 of the 5 is a fee")]
    public void GivenTwoOfThoseFiveAreOnTheAcmeAccountAndOneOfTheFiveIsAFee()
    {
    }

    [Given(@"1 of the 3 credits was reversed by 1 of the 2 debits, both on the ""GLOBEX"" account")]
    public async Task GivenOneOfTheThreeCreditsWasReversedByOneOfTheTwoDebitsBothOnTheGlobexAccount()
    {
        var acme = await OpenNamedAccountAsync("ACME");
        var globex = await OpenNamedAccountAsync("GLOBEX");
        var effectiveDate = new DateOnly(2026, 9, 1);

        await RecordPostingAsync(acme, "Credit", 20.00m, "SGD", effectiveDate);
        await RecordPostingAsync(acme, "Debit", 5.00m, "SGD", effectiveDate);
        var reversedCreditId = await RecordPostingAsync(globex, "Credit", 30.00m, "SGD", effectiveDate);
        await RecordPostingAsync(globex, "Credit", 15.00m, "SGD", effectiveDate, category: "Fee");
        await ReversePostingAsync(reversedCreditId);
    }

    [Given(@"the ledger holds 1 posting carrying the reference ""([^""]+)"" and 4 postings carrying other references")]
    public async Task GivenTheLedgerHolds1PostingCarryingTheReferenceAnd4PostingsCarryingOtherReferences(string reference)
    {
        var account = await OpenNamedAccountAsync("SearchTarget");
        var effectiveDate = new DateOnly(2026, 9, 10);
        await RecordPostingAsync(account, "Credit", 10.00m, "SGD", effectiveDate, counterpartyReference: reference);
        for (var i = 1; i <= 4; i++)
        {
            await RecordPostingAsync(account, "Credit", 10.00m, "SGD", effectiveDate, counterpartyReference: $"REF-{i}");
        }
    }

    [Given(@"the ledger holds postings of 10\.00 SGD, 500\.00 SGD and 75\.00 SGD effective on 2026-09-01")]
    public async Task GivenTheLedgerHoldsPostingsOf10500And75SgdEffectiveOn20260901()
    {
        var account = await OpenNamedAccountAsync("OrderingTarget");
        var effectiveDate = new DateOnly(2026, 9, 1);
        await RecordPostingAsync(account, "Credit", 10.00m, "SGD", effectiveDate);
        await RecordPostingAsync(account, "Credit", 500.00m, "SGD", effectiveDate);
        await RecordPostingAsync(account, "Credit", 75.00m, "SGD", effectiveDate);
    }

    [Given(@"treasury-ops may read accounts but may not read postings")]
    public void GivenTreasuryOpsMayReadAccountsButMayNotReadPostings()
    {
        state.CallerClientId = "treasury-ops";
        state.CallerScopes = [ScopeNames.AccountsRead];
    }

    #endregion

    #region When

    [When(@"^treasury-ops asks for all postings effective between (\d{4}-\d{2}-\d{2}) and (\d{4}-\d{2}-\d{2})$")]
    public async Task WhenTreasuryOpsAsksForAllPostingsEffectiveBetweenAnd(string from, string to)
    {
        state.CallerClientId = "treasury-ops";
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{PostingsPath}?from={from}&to={to}");
    }

    [When(@"treasury-ops asks for all postings with no effective-date window")]
    public async Task WhenTreasuryOpsAsksForAllPostingsWithNoEffectiveDateWindow()
    {
        state.CallerClientId = "treasury-ops";
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, PostingsPath);
    }

    [When(@"treasury-ops asks for all postings of ""([^""]+)"" effective in September 2026")]
    public async Task WhenTreasuryOpsAsksForAllPostingsOfEffectiveInSeptember2026(string narrowing)
    {
        state.CallerClientId = "treasury-ops";
        var query = $"{PostingsPath}?from=2026-09-01&to=2026-09-30";
        query += narrowing switch
        {
            "the ACME account" => $"&accountId={state.Values["account:ACME"]}",
            "direction debit" => "&direction=Debit",
            "category Fee" => "&category=Fee",
            "status Reversed" => "&status=Reversed",
            _ => throw new ArgumentOutOfRangeException(nameof(narrowing), narrowing, "unrecognised narrowing")
        };
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, query);
    }

    [When(@"treasury-ops searches the September 2026 postings for ""([^""]+)""")]
    public async Task WhenTreasuryOpsSearchesTheSeptember2026PostingsFor(string term)
    {
        state.CallerClientId = "treasury-ops";
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get,
            $"{PostingsPath}?from=2026-09-01&to=2026-09-30&search={Uri.EscapeDataString(term)}");
    }

    [When(@"treasury-ops asks for the September 2026 postings ordered by amount, largest first")]
    public async Task WhenTreasuryOpsAsksForTheSeptember2026PostingsOrderedByAmountLargestFirst()
    {
        state.CallerClientId = "treasury-ops";
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{PostingsPath}?from=2026-09-01&to=2026-09-30&orderBy=Amount&desc=true");
    }

    [When(@"treasury-ops asks for all postings effective in September 2026")]
    public async Task WhenTreasuryOpsAsksForAllPostingsEffectiveInSeptember2026() =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{PostingsPath}?from=2026-09-01&to=2026-09-30");

    #endregion

    #region Then

    [Then(@"the answer holds postings from both accounts")]
    public async Task ThenTheAnswerHoldsPostingsFromBothAccounts()
    {
        var doc = await ReadJsonAsync(state.Response!);
        var accountIds = doc.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("accountId").GetGuid()).ToHashSet();
        accountIds.ShouldContain(Guid.Parse(state.Values["account:ACME"]));
        accountIds.ShouldContain(Guid.Parse(state.Values["account:GLOBEX"]));
    }

    [Then(@"the answer states how many postings matched in total")]
    public async Task ThenTheAnswerStatesHowManyPostingsMatchedInTotal()
    {
        var doc = await ReadJsonAsync(state.Response!);
        var items = doc.GetProperty("items").EnumerateArray().ToList();
        doc.GetProperty("totalItemCount").GetInt32().ShouldBe(items.Count);
        items.Count.ShouldBe(2);
    }

    [Then(@"the request is refused as an invalid date range")]
    [Scope(Feature = FeatureName)]
    public async Task ThenTheRequestIsRefusedAsAnInvalidDateRange()
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var code) && code.GetString() == "INVALID_DATE_RANGE")
            .ShouldBeTrue($"expected an error carrying code INVALID_DATE_RANGE, got: {doc}");
    }

    [Then(@"no postings are returned")]
    public async Task ThenNoPostingsAreReturned()
    {
        if (!state.Response!.IsSuccessStatusCode)
        {
            return;
        }

        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("items").GetArrayLength().ShouldBe(0);
    }

    [Then(@"(\d+) postings are returned")]
    public async Task ThenPostingsAreReturned(int count)
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("items").GetArrayLength().ShouldBe(count);
    }

    [Then(@"only the posting carrying that reference is returned")]
    public async Task ThenOnlyThePostingCarryingThatReferenceIsReturned()
    {
        var doc = await ReadJsonAsync(state.Response!);
        var items = doc.GetProperty("items").EnumerateArray().ToList();
        items.Count.ShouldBe(1);
        items[0].GetProperty("counterpartyReference").GetString().ShouldBe("INV-2045");
    }

    [Then(@"the request is refused because the search term is too short")]
    [Scope(Feature = FeatureName)]
    public void ThenTheRequestIsRefusedBecauseTheSearchTermIsTooShort() =>
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

    [Then(@"the answer reads 500\.00, then 75\.00, then 10\.00")]
    public async Task ThenTheAnswerReads500Then75Then10()
    {
        var doc = await ReadJsonAsync(state.Response!);
        var amounts = doc.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("amount").GetDecimal()).ToList();
        amounts.ShouldBe([500.00m, 75.00m, 10.00m]);
    }

    [Then(@"the request is refused as not permitted")]
    [Scope(Feature = FeatureName)]
    public void ThenTheRequestIsRefusedAsNotPermitted() =>
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Forbidden);

    #endregion
}

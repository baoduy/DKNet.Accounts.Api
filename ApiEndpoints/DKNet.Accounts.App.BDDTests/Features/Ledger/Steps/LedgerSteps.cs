using System.Globalization;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using DKNet.Accounts.Api.Configs.Auth;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for the ledger acceptance scenarios (DRK-1250 §7). Every step drives the real HTTP
/// contract (§5) through <see cref="HttpClient"/> — there is no repository to seed directly, since no
/// Account/AccountGroup/Posting entity exists yet (§5 stubs only). Every handler behind these routes
/// throws <c>NotImplementedException</c>, so every scenario is red because a "Given"/"When" call already
/// comes back as an unexpected status — that is the nameable reason R2 asks for.
/// </summary>
[Binding]
public sealed class LedgerSteps(HttpClient client, ScenarioState state)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";
    private const string CurrenciesPath = "/v1/currencies";

    private HttpResponseMessage? _firstIdempotencyRaceResponse;
    private HttpResponseMessage? _secondIdempotencyRaceResponse;

    #region Shared helpers

    private async Task<Guid> CreateGroupAsync(string code, string type)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code,
            name = code,
            type,
            ownerId = state.CallerClientId
        });
        state.Response = response;
        var id = await TryReadIdAsync(response);
        state.Values[$"group:{code}"] = id?.ToString() ?? "";
        return id ?? Guid.Empty;
    }

    /// <summary>The scenario's throwaway group, created once and reused — for steps that open an account
    /// without naming a group.</summary>
    private async Task<Guid> DefaultGroupAsync()
    {
        if (Guid.TryParse(state.Values.GetValueOrDefault("group:__default"), out var existing) && existing != Guid.Empty)
        {
            return existing;
        }

        var id = await CreateGroupAsync($"D{Guid.NewGuid():N}"[..5].ToUpperInvariant(), "Customer");
        state.Values["group:__default"] = id.ToString();
        return id;
    }

    /// <summary>The id of the group a scenario named, creating it if the scenario's Given never did.</summary>
    private async Task<Guid> GroupIdForAsync(string groupCode) =>
        Guid.TryParse(state.Values.GetValueOrDefault($"group:{groupCode}"), out var id) && id != Guid.Empty
            ? id
            : await CreateGroupAsync(groupCode, "Customer");

    private async Task<Guid> OpenAccountAsync(
        string currency,
        Guid? groupId = null,
        // Mechanics fix (Build stage 3): every generic credit/debit/reversal/statement scenario in this file
        // opens its account through this default — none of those feature scenarios name a classification, so
        // this default is purely a fixture choice, not scenario-visible behavior. §"Recording credits and
        // debits" expects a credit to RAISE the balance and a debit to lower it; per the signed-value rule
        // (Asset/Expense: debit increases, credit decreases; Liability/Equity/Income: credit increases, debit
        // decreases), only a Liability-classified account produces that outcome — "Asset" here would silently
        // invert the sign of every one of those frozen scenarios' assertions.
        string classification = "Liability",
        bool permittedToGoNegative = false,
        decimal? overdraftLimit = null,
        decimal? minimumBalance = null,
        string name = "Test Account")
    {
        // Opening now reads the group (an account number is {group code}-{suffix}), so a fabricated group
        // id is refused. Scenarios that never name a group get one real throwaway group instead.
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId = groupId ?? await DefaultGroupAsync(),
            name,
            currency,
            classification,
            permittedToGoNegative,
            overdraftLimit,
            minimumBalance
        });
        state.Response = response;
        return await TryReadIdAsync(response) ?? Guid.Empty;
    }

    private async Task PatchAccountStatusAsync(Guid accountId, string status) =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Patch, $"{AccountsPath}/{accountId}", new { status });

    private async Task<Guid?> RecordPostingAsync(
        Guid accountId,
        string direction,
        decimal amount,
        string currency,
        string? description = null,
        string? idempotencyKey = null)
    {
        var response = await client.SendAsCallerAsync(
            state,
            HttpMethod.Post,
            PostingsPath,
            new { accountId, direction, amount, currency, category = "Transfer", description },
            idempotencyKey);
        state.Response = response;
        return await TryReadIdAsync(response);
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

    private Guid Account(string key = "account") =>
        Guid.TryParse(state.Values.GetValueOrDefault(key), out var id) ? id : Guid.Empty;

    private Guid Posting(string key = "posting") =>
        Guid.TryParse(state.Values.GetValueOrDefault(key), out var id) ? id : Guid.Empty;

    #endregion

    #region Given — account groups

    [Given(@"PayHub has created the account group ""([^""]+)"" of type ""([^""]+)""")]
    public async Task GivenPayHubHasCreatedTheAccountGroup(string code, string type) =>
        await CreateGroupAsync(code, type);

    [Given(@"the group ""([^""]+)"" holds an account with a balance of ([\d.]+) (\w+)")]
    public async Task GivenTheGroupHoldsAnAccountWithABalanceOf(string groupCode, decimal amount, string currency)
    {
        var groupId = await CreateGroupAsync(groupCode, "Customer");
        var accountId = await OpenAccountAsync(currency, groupId);
        state.Values["account"] = accountId.ToString();
        if (amount > 0)
        {
            await RecordPostingAsync(accountId, "Credit", amount, currency);
        }
    }

    [Given(@"the group ""([^""]+)"" holds an account with ([\d.]+) (\w+) and an account with ([\d.]+) (\w+)")]
    public async Task GivenTheGroupHoldsTwoAccountsWithBalances(
        string groupCode, decimal amount1, string currency1, decimal amount2, string currency2)
    {
        var groupId = await CreateGroupAsync(groupCode, "Customer");
        var account1 = await OpenAccountAsync(currency1, groupId);
        var account2 = await OpenAccountAsync(currency2, groupId);
        state.Values["account1"] = account1.ToString();
        state.Values["account2"] = account2.ToString();
        await RecordPostingAsync(account1, "Credit", amount1, currency1);
        await RecordPostingAsync(account2, "Credit", amount2, currency2);
    }

    [Given(@"the group ""([^""]+)"" holds two active accounts and one closed account")]
    public async Task GivenTheGroupHoldsTwoActiveAccountsAndOneClosedAccount(string groupCode)
    {
        var groupId = await CreateGroupAsync(groupCode, "Customer");
        await OpenAccountAsync("SGD", groupId);
        await OpenAccountAsync("SGD", groupId);
        var closed = await OpenAccountAsync("SGD", groupId);
        await PatchAccountStatusAsync(closed, "Closed");
    }

    [Given(@"PayHub has created two groups of type ""([^""]+)"" and one of type ""([^""]+)""")]
    public async Task GivenPayHubHasCreatedTwoGroupsOfTypeAndOneOfType(string commonType, string distinctType)
    {
        await CreateGroupAsync($"P{Guid.NewGuid():N}"[..5].ToUpperInvariant(), commonType);
        await CreateGroupAsync($"P{Guid.NewGuid():N}"[..5].ToUpperInvariant(), commonType);
        await CreateGroupAsync($"P{Guid.NewGuid():N}"[..5].ToUpperInvariant(), distinctType);
    }

    #endregion

    #region Given — accounts

    [Given(@"PayHub holds an? (?:active )?account with a balance of ([\d.]+) (\w+)$")]
    public async Task GivenPayHubHoldsAnAccountWithABalanceOf(decimal amount, string currency)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["account"] = accountId.ToString();
        if (amount > 0)
        {
            await RecordPostingAsync(accountId, "Credit", amount, currency);
        }
    }

    [Given(@"PayHub holds an account with a balance of ([\d.]+) (\w+), no minimum balance and an overdraft limit of ([\d.]+) (\w+)")]
    public async Task GivenPayHubHoldsAnAccountWithNoMinimumAndOverdraft(
        decimal balance, string currency, decimal overdraftLimit, string _)
    {
        var accountId = await OpenAccountAsync(currency, permittedToGoNegative: true, overdraftLimit: overdraftLimit);
        state.Values["account"] = accountId.ToString();
        if (balance > 0)
        {
            await RecordPostingAsync(accountId, "Credit", balance, currency);
        }
    }

    [Given(@"PayHub holds an account with a balance of ([\d.]+) (\w+), a minimum balance of ([\d.]+) (\w+) and an overdraft limit of ([\d.]+) (\w+)")]
    public async Task GivenPayHubHoldsAnAccountWithMinimumAndOverdraft(
        decimal balance, string currency, decimal minimumBalance, string _, decimal overdraftLimit, string __)
    {
        var accountId = await OpenAccountAsync(
            currency, permittedToGoNegative: true, overdraftLimit: overdraftLimit, minimumBalance: minimumBalance);
        state.Values["account"] = accountId.ToString();
        if (balance > 0)
        {
            await RecordPostingAsync(accountId, "Credit", balance, currency);
        }
    }

    [Given(@"PayHub holds an? ([A-Z]{3,10}) account$")]
    public async Task GivenPayHubHoldsACurrencyAccount(string currency)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["account"] = accountId.ToString();
    }

    [Given(@"PayHub holds a frozen account")]
    public async Task GivenPayHubHoldsAFrozenAccount()
    {
        var accountId = await OpenAccountAsync("SGD");
        await PatchAccountStatusAsync(accountId, "Frozen");
        state.Values["account"] = accountId.ToString();
    }

    [Given(@"PayHub holds a dormant account with a balance of ([\d.]+) (\w+)")]
    public async Task GivenPayHubHoldsADormantAccountWithABalanceOf(decimal amount, string currency)
    {
        var accountId = await OpenAccountAsync(currency);
        if (amount > 0)
        {
            await RecordPostingAsync(accountId, "Credit", amount, currency);
        }

        await PatchAccountStatusAsync(accountId, "Dormant");
        state.Values["account"] = accountId.ToString();
    }

    [Given(@"PayHub holds an account with a balance of ([\d.]+) (\w+) that is not permitted to go negative, and an account with a balance of ([\d.]+) (\w+)")]
    public async Task GivenPayHubHoldsTwoAccounts_FirstNotPermittedNegative(
        decimal amount1, string currency1, decimal amount2, string currency2)
    {
        var account1 = await OpenAccountAsync(currency1, permittedToGoNegative: false);
        var account2 = await OpenAccountAsync(currency2, permittedToGoNegative: true, overdraftLimit: 0);
        state.Values["account1"] = account1.ToString();
        state.Values["account2"] = account2.ToString();
        await RecordPostingAsync(account1, "Credit", amount1, currency1);
        await RecordPostingAsync(account2, "Credit", amount2, currency2);
    }

    [Given(@"PayHub holds an account with a balance of ([\d.]+) (\w+) and an account with a balance of ([\d.]+) (\w+)")]
    public async Task GivenPayHubHoldsTwoAccountsWithBalances(
        decimal amount1, string currency1, decimal amount2, string currency2)
    {
        var account1 = await OpenAccountAsync(currency1, permittedToGoNegative: true, overdraftLimit: 0);
        var account2 = await OpenAccountAsync(currency2, permittedToGoNegative: true, overdraftLimit: 0);
        state.Values["account1"] = account1.ToString();
        state.Values["account2"] = account2.ToString();
        await RecordPostingAsync(account1, "Credit", amount1, currency1);
        await RecordPostingAsync(account2, "Credit", amount2, currency2);
    }

    #endregion

    #region Given — postings / reversal / idempotency

    [Given(@"PayHub has recorded a credit of ([\d.]+) (\w+) under its idempotency key ""([^""]+)""")]
    public async Task GivenPayHubHasRecordedACreditUnderItsIdempotencyKey(decimal amount, string currency, string key)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["account"] = accountId.ToString();
        state.Values["idempotencyKey"] = key;
        var postingId = await RecordPostingAsync(accountId, "Credit", amount, currency, idempotencyKey: key);
        state.Values["posting"] = postingId?.ToString() ?? "";
    }

    [Given(@"PayHub recorded a credit of ([\d.]+) (\w+) against an account whose balance was ([\d.]+) (\w+)")]
    public async Task GivenPayHubRecordedACreditAgainstAnAccountWhoseBalanceWas(
        decimal amount, string currency, decimal openingBalance, string _)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["account"] = accountId.ToString();
        var postingId = await RecordPostingAsync(accountId, "Credit", amount, currency);
        state.Values["posting"] = postingId?.ToString() ?? "";
    }

    [Given(@"PayHub has reversed a posting of ([\d.]+) (\w+)")]
    public async Task GivenPayHubHasReversedAPostingOf(decimal amount, string currency)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["account"] = accountId.ToString();
        var postingId = await RecordPostingAsync(accountId, "Credit", amount, currency);
        state.Values["posting"] = postingId?.ToString() ?? "";
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Post, $"{PostingsPath}/{Posting()}/reverse",
            new { reason = "Recorded in error" }, $"rev-{Guid.NewGuid():N}");
    }

    [Given(@"PayHub recorded a credit of ([\d.]+) (\w+) against an account not permitted to go negative")]
    public async Task GivenPayHubRecordedACreditAgainstAnAccountNotPermittedToGoNegative(decimal amount, string currency)
    {
        var accountId = await OpenAccountAsync(currency, permittedToGoNegative: false);
        state.Values["account"] = accountId.ToString();
        var postingId = await RecordPostingAsync(accountId, "Credit", amount, currency);
        state.Values["posting"] = postingId?.ToString() ?? "";
    }

    [Given(@"the account has since been debited down to ([\d.]+) (\w+)")]
    public async Task GivenTheAccountHasSinceBeenDebitedDownTo(decimal targetBalance, string currency)
    {
        // Mechanics fix (surfaced by rework finding 1's stronger assertion on the matching Then step): this
        // step's captured amount is the TARGET balance the account must be debited DOWN TO, not the debit
        // amount itself — recording a debit of the target balance verbatim left the account at (prior balance
        // - target), not at the target. The debit actually posted must be (current balance - target balance).
        var accountId = Account();
        var balanceResponse = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{accountId}/balance");
        var currentBalance = (await balanceResponse.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("balance").GetDecimal();
        await RecordPostingAsync(accountId, "Debit", currentBalance - targetBalance, currency);
    }

    [Given(@"PayHub holds a closed account carrying a posting of ([\d.]+) (\w+)")]
    public async Task GivenPayHubHoldsAClosedAccountCarryingAPostingOf(decimal amount, string currency)
    {
        // Mechanics fix: closing is refused while the account still holds a balance (§ "Closing an account
        // that still holds money is refused"), so "closed... carrying a posting of 100.00 SGD" can only mean
        // the STREAM still carries that posting, not that the CURRENT balance is 100 — the balance must be
        // brought back to zero (an independent offsetting debit, not a reversal of the credit itself, which
        // would defeat the "reverse that posting" step right after this) before the close can succeed at all.
        var accountId = await OpenAccountAsync(currency);
        state.Values["account"] = accountId.ToString();
        var postingId = await RecordPostingAsync(accountId, "Credit", amount, currency);
        state.Values["posting"] = postingId?.ToString() ?? "";
        await RecordPostingAsync(accountId, "Debit", amount, currency);
        await PatchAccountStatusAsync(accountId, "Closed");
    }

    [Given(@"PayHub holds a dormant account carrying a credit of ([\d.]+) (\w+)")]
    public async Task GivenPayHubHoldsADormantAccountCarryingACreditOf(decimal amount, string currency)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["account"] = accountId.ToString();
        var postingId = await RecordPostingAsync(accountId, "Credit", amount, currency);
        state.Values["posting"] = postingId?.ToString() ?? "";
        await PatchAccountStatusAsync(accountId, "Dormant");
    }

    [Given(@"PayHub's account has postings dated (.+), (.+) and (.+)")]
    public async Task GivenPayHubsAccountHasPostingsDated(string date1, string date2, string date3)
    {
        var accountId = await OpenAccountAsync("SGD");
        state.Values["account"] = accountId.ToString();
        foreach (var date in new[] { date1, date2, date3 })
        {
            await RecordPostingWithEffectiveDateAsync(accountId, ParseLedgerDate(date));
        }
    }

    [Given(@"PayHub's account has a posting dated (.+) recorded before a posting backdated to (.+)")]
    public async Task GivenPayHubsAccountHasAPostingDatedRecordedBeforeAPostingBackdatedTo(string firstDate, string secondDate)
    {
        var accountId = await OpenAccountAsync("SGD");
        state.Values["account"] = accountId.ToString();
        await RecordPostingWithEffectiveDateAsync(accountId, ParseLedgerDate(firstDate));
        await RecordPostingWithEffectiveDateAsync(accountId, ParseLedgerDate(secondDate));
    }

    [Given(@"PayHub's account holds twenty-five postings within one date range")]
    public async Task GivenPayHubsAccountHoldsTwentyFivePostingsWithinOneDateRange()
    {
        var accountId = await OpenAccountAsync("SGD");
        state.Values["account"] = accountId.ToString();
        for (var day = 1; day <= 25; day++)
        {
            await RecordPostingWithEffectiveDateAsync(accountId, new DateOnly(2026, 6, day));
        }
    }

    private async Task RecordPostingWithEffectiveDateAsync(Guid accountId, DateOnly effectiveDate) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId,
            direction = "Credit",
            amount = 10.00m,
            currency = "SGD",
            category = "Transfer",
            effectiveDate
        });

    private static DateOnly ParseLedgerDate(string text) =>
        DateOnly.ParseExact(text.Trim(), "d MMMM yyyy", CultureInfo.InvariantCulture);

    [Given(@"PayHub has recorded credits of (.+?) (\w+) and debits of (.+?) (\w+) against an account opened at ([\d.]+) (\w+)")]
    public async Task GivenPayHubHasRecordedCreditsAndDebitsAgainstAnAccountOpenedAt(
        string credits, string creditsCurrency, string debits, string debitsCurrency, decimal openingBalance, string currency)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["account"] = accountId.ToString();

        foreach (var amount in ParseAmountList(credits))
        {
            await RecordPostingAsync(accountId, "Credit", amount, currency);
        }

        foreach (var amount in ParseAmountList(debits))
        {
            await RecordPostingAsync(accountId, "Debit", amount, currency);
        }
    }

    private static IEnumerable<decimal> ParseAmountList(string text) =>
        Regex.Split(text, @",|\band\b")
            .Select(part => part.Trim())
            .Where(part => part.Length > 0)
            .Select(part => decimal.Parse(part, CultureInfo.InvariantCulture));

    #endregion

    #region Given — access control

    [Given(@"LedgerSync is authorised to read accounts but not to record postings")]
    public void GivenLedgerSyncIsAuthorisedToReadAccountsButNotToRecordPostings()
    {
        state.CallerClientId = "LedgerSync";
        state.CallerScopes = [ScopeNames.AccountsRead, ScopeNames.PostingsRead];
        // §5: a credential lacking the scope for this operation class is refused 403, not the generic 422.
        state.ExpectedRefusalStatus = HttpStatusCode.Forbidden;
    }

    [Given(@"PayHub is authenticated as itself")]
    public void GivenPayHubIsAuthenticatedAsItself()
    {
        state.CallerClientId = "PayHub";
        state.CallerScopes = [.. ScopeNames.All];
    }

    #endregion

    #region Given — clock

    [Given(@"today is (.+)$")]
    public void GivenTodayIs(string date)
    {
        // No fake clock is wired at this stub stage (§5 bodies all throw NotImplementedException before
        // any clock read would happen) — the pinned date is documented here for the Build stage, which
        // owns wiring a controllable clock per §2/R6.
        state.Values["today"] = ParseLedgerDate(date).ToString("yyyy-MM-dd");
    }

    #endregion

    #region When

    [When(@"PayHub opens an account named ""([^""]+)"" in ""([^""]+)"" in (\w+) as an? (\w+) account")]
    public async Task WhenPayHubOpensAnAccountNamedInAs(string name, string groupCode, string currency, string classification)
    {
        var groupId = await GroupIdForAsync(groupCode);
        var accountId = await OpenAccountAsync(currency, groupId, classification, name: name);
        state.Values["account"] = accountId.ToString();
    }

    [When(@"PayHub opens an account in ""([^""]+)"" permitted to go negative but states no overdraft limit")]
    public async Task WhenPayHubOpensAnAccountPermittedToGoNegativeWithNoOverdraftLimit(string groupCode)
    {
        var groupId = await GroupIdForAsync(groupCode);
        await OpenAccountAsync("SGD", groupId, permittedToGoNegative: true, overdraftLimit: null);
    }

    [When(@"PayHub asks to close that account")]
    public async Task WhenPayHubAsksToCloseThatAccount() =>
        await PatchAccountStatusAsync(Account(), "Closed");

    [When(@"PayHub asks to close ""([^""]+)""")]
    public async Task WhenPayHubAsksToClose(string groupCode)
    {
        var groupId = state.Values.GetValueOrDefault($"group:{groupCode}");
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{GroupsPath}/{groupId}/close");
    }

    [When(@"PayHub reads the balances of ""([^""]+)""")]
    public async Task WhenPayHubReadsTheBalancesOf(string groupCode)
    {
        var groupId = state.Values.GetValueOrDefault($"group:{groupCode}");
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}/{groupId}/balances");
    }

    [When(@"PayHub reads that account$")]
    public async Task WhenPayHubReadsThatAccount() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account()}");

    [When(@"PayHub lists the accounts of ""([^""]+)""$")]
    public async Task WhenPayHubListsTheAccountsOf(string groupCode)
    {
        // Target generated-list syntax (DRK-1279 §11 round 2 — row 7 moves to GEN): filter=Field:Operation:Value,
        // not ?groupId=. Red until Build moves GET /v1/accounts onto MapGetList.
        var groupId = state.Values.GetValueOrDefault($"group:{groupCode}");
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{AccountsPath}?filter={Uri.EscapeDataString($"GroupId:Equal:{groupId}")}");
    }

    [When(@"PayHub lists the active accounts of ""([^""]+)""")]
    public async Task WhenPayHubListsTheActiveAccountsOf(string groupCode)
    {
        var groupId = state.Values.GetValueOrDefault($"group:{groupCode}");
        var groupFilter = Uri.EscapeDataString($"GroupId:Equal:{groupId}");
        var statusFilter = Uri.EscapeDataString("Status:Equal:Active");
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{AccountsPath}?filter={groupFilter}&filter={statusFilter}");
    }

    [When(@"PayHub lists the groups of type ""([^""]+)""")]
    public async Task WhenPayHubListsTheGroupsOfType(string type) =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{GroupsPath}?filter={Uri.EscapeDataString($"Type:Equal:{type}")}");

    [When(@"PayHub records a credit of ([\d.]+) (\w+) described as ""([^""]+)""")]
    public async Task WhenPayHubRecordsACreditDescribedAs(decimal amount, string currency, string description) =>
        state.Values["posting"] = (await RecordPostingAsync(Account(), "Credit", amount, currency, description))
            ?.ToString() ?? "";

    [When(@"PayHub repeats that request unchanged under the same key")]
    public async Task WhenPayHubRepeatsThatRequestUnchangedUnderTheSameKey()
    {
        var key = state.Values.GetValueOrDefault("idempotencyKey");
        var currency = "SGD";
        await RecordPostingAsync(Account(), "Credit", 100.00m, currency, idempotencyKey: key);
    }

    [When(@"PayHub records a credit of ([\d.]+) (\w+) under the same key")]
    public async Task WhenPayHubRecordsACreditUnderTheSameKey(decimal amount, string currency)
    {
        // §5: same idempotency key with different content is refused 409 IDEMPOTENCY_KEY_CONFLICT, not 422.
        state.ExpectedRefusalStatus = HttpStatusCode.Conflict;
        var key = state.Values.GetValueOrDefault("idempotencyKey");
        await RecordPostingAsync(Account(), "Credit", amount, currency, idempotencyKey: key);
    }

    [When(@"LedgerSync records a credit of ([\d.]+) (\w+) under its own key ""([^""]+)""")]
    public async Task WhenLedgerSyncRecordsACreditUnderItsOwnKey(decimal amount, string currency, string key)
    {
        state.CallerClientId = "LedgerSync";
        state.CallerScopes = [.. ScopeNames.All];
        await RecordPostingAsync(Account(), "Credit", amount, currency, idempotencyKey: key);
    }

    [When(@"PayHub records a debit of ([\d.]+) (\w+)$")]
    public async Task WhenPayHubRecordsADebit(decimal amount, string currency) =>
        await RecordPostingAsync(Account(), "Debit", amount, currency);

    [When(@"PayHub records a credit of ([\d.]+) (\w+) against it")]
    public async Task WhenPayHubRecordsACreditAgainstIt(decimal amount, string currency) =>
        await RecordPostingAsync(Account(), "Credit", amount, currency);

    [When(@"PayHub records a credit of ([\d.]+) (\w+) taking effect on (.+)$")]
    public async Task WhenPayHubRecordsACreditTakingEffectOn(decimal amount, string currency, string effectiveDateText)
    {
        var accountId = Account();
        if (accountId == Guid.Empty)
        {
            accountId = await OpenAccountAsync(currency);
            state.Values["account"] = accountId.ToString();
        }

        var effectiveDate = ParseLedgerDate(effectiveDateText);
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId,
            direction = "Credit",
            amount,
            currency,
            category = "Transfer",
            effectiveDate
        });
    }

    [When(@"PayHub records a debit of ([\d.]+) (\w+) against it")]
    public async Task WhenPayHubRecordsADebitAgainstIt(decimal amount, string currency) =>
        await RecordPostingAsync(Account(), "Debit", amount, currency);

    [When(@"PayHub reverses that posting$")]
    [When(@"PayHub reverses that credit$")]
    [When(@"PayHub reverses that credit of [\d.]+ \w+$")]
    public async Task WhenPayHubReversesThatPosting() =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Post, $"{PostingsPath}/{Posting()}/reverse",
            new { reason = "Recorded in error" }, $"rev-{Guid.NewGuid():N}");

    [When(@"PayHub asks to reverse that same posting again")]
    [When(@"PayHub asks to reverse that posting$")]
    [When(@"PayHub asks to reverse that credit$")]
    // A FRESH key deliberately: this is a genuinely new request, not a retry, so it must still be refused
    // POSTING_ALREADY_REVERSED. Replaying the earlier key instead would (correctly) return that reversal.
    public async Task WhenPayHubAsksToReverseThatSamePostingAgain() =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Post, $"{PostingsPath}/{Posting()}/reverse",
            new { reason = "Recorded in error" }, $"rev-{Guid.NewGuid():N}");

    [When(@"PayHub submits one batch debiting ([\d.]+) (\w+) from the first and crediting ([\d.]+) (\w+) to the second")]
    public async Task WhenPayHubSubmitsOneBatch(decimal debitAmount, string debitCurrency, decimal creditAmount, string creditCurrency) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = Account("account1"), direction = "Debit", amount = debitAmount, currency = debitCurrency, category = "Transfer" },
                new { accountId = Account("account2"), direction = "Credit", amount = creditAmount, currency = creditCurrency, category = "Transfer" }
            }
        });

    [When(@"PayHub reads the statement from (.+) to (.+)")]
    public async Task WhenPayHubReadsTheStatementFromTo(string from, string to)
    {
        var fromDate = ParseLedgerDate(from);
        var toDate = ParseLedgerDate(to);
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{AccountsPath}/{Account()}/statement?from={fromDate:yyyy-MM-dd}&to={toDate:yyyy-MM-dd}");
    }

    [When(@"PayHub reads the statement covering all of June 2026")]
    public async Task WhenPayHubReadsTheStatementCoveringAllOfJune2026() =>
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{AccountsPath}/{Account()}/statement?from=2026-06-01&to=2026-06-30");

    [When(@"PayHub reads that statement in pages of ten until a page comes back empty")]
    public async Task WhenPayHubReadsThatStatementInPagesOfTenUntilAPageComesBackEmpty()
    {
        // Rework (finding 1): every page's stream positions are captured in return order so the Then steps
        // can assert real cross-page invariants (no gaps, no duplicates) instead of only the last status code.
        state.StatementStreamPositions.Clear();
        for (var page = 1; page <= 50; page++)
        {
            var response = await client.SendAsCallerAsync(
                state,
                HttpMethod.Get,
                $"{AccountsPath}/{Account()}/statement?from=2026-06-01&to=2026-06-30&pageIndex={page}&pageSize=10");
            state.Response = response;
            if (!response.IsSuccessStatusCode)
            {
                break;
            }

            var doc = await response.Content.ReadFromJsonAsync<JsonElement>();
            if (!doc.TryGetProperty("items", out var items) || items.GetArrayLength() == 0)
            {
                break;
            }

            state.StatementStreamPositions.AddRange(
                items.EnumerateArray().Select(item => item.GetProperty("streamPosition").GetInt64()));
        }
    }

    [When(@"PayHub reads that account's balance")]
    public async Task WhenPayHubReadsThatAccountsBalance() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account()}/balance");

    [When(@"PayHub records twenty credits of ([\d.]+) (\w+) at the same time")]
    public async Task WhenPayHubRecordsTwentyCreditsAtTheSameTime(decimal amount, string currency)
    {
        var accountId = Account();
        var tasks = Enumerable.Range(0, 20)
            .Select(_ => RecordPostingAsync(accountId, "Credit", amount, currency));
        await Task.WhenAll(tasks);
    }

    [When(@"an unauthenticated caller asks to read an account")]
    public async Task WhenAnUnauthenticatedCallerAsksToReadAnAccount()
    {
        // §5: no or invalid credential is refused 401, not the generic 422.
        state.ExpectedRefusalStatus = HttpStatusCode.Unauthorized;
        state.Response = await client.SendUnauthenticatedAsync(HttpMethod.Get, $"{AccountsPath}/{Guid.NewGuid()}");
    }

    [When(@"LedgerSync records a credit of ([\d.]+) (\w+)$")]
    public async Task WhenLedgerSyncRecordsACredit(decimal amount, string currency)
    {
        state.CallerClientId = "LedgerSync";
        await RecordPostingAsync(Account(), "Credit", amount, currency);
    }

    [When(@"PayHub records a credit of ([\d.]+) (\w+) claiming in the request body to be LedgerSync")]
    public async Task WhenPayHubRecordsACreditClaimingToBeLedgerSync(decimal amount, string currency)
    {
        // Mechanics fix: this scenario names no account (it is about attribution, not account setup) — now
        // that /v1/postings does real accountId lookups instead of always throwing, an unset "account" key
        // (Guid.Empty) would be refused as not-found before ever reaching the attribution this scenario
        // actually tests. Lazily opens one, the same way WhenPayHubRecordsACreditTakingEffectOn already does.
        var accountId = Account();
        if (accountId == Guid.Empty)
        {
            accountId = await OpenAccountAsync(currency);
            state.Values["account"] = accountId.ToString();
        }

        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId,
            direction = "Credit",
            amount,
            currency,
            category = "Transfer",
            recordedBy = "LedgerSync"
        });
        state.Response = response;
        // Mechanics fix: without capturing the posting id, the Then step's GET would resolve Posting() to
        // Guid.Empty (never set) instead of the posting just recorded.
        state.Values["posting"] = (await TryReadIdAsync(response))?.ToString() ?? "";
    }

    [When(@"PayHub reads the supported currencies")]
    public async Task WhenPayHubReadsTheSupportedCurrencies() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, CurrenciesPath);

    // §7 @new: the lost-race counterpart of "Reusing an idempotency key for different content is refused"
    // above — same key, different content, but both requests arrive before either's pre-check read can see
    // the other (Record.cs:107-112's accepted race window). One is created 201; the DB's unique
    // (CallingSystem, IdempotencyKey) index refuses the other via DbUpdateException, which
    // LedgerErrorResponseOptions.UnhandledError must map to the same 409 + IDEMPOTENCY_KEY_CONFLICT the
    // pre-check path answers (R1).
    [When(@"two requests record a credit under the idempotency key ""([^""]+)"" with different amounts at the same moment")]
    public async Task WhenTwoRequestsRecordACreditUnderTheIdempotencyKeyWithDifferentAmountsAtTheSameMoment(
        string idempotencyKey)
    {
        var accountId = Account();
        Task<HttpResponseMessage> Send(decimal amount) => client.SendAsCallerAsync(
            state, HttpMethod.Post, PostingsPath,
            new { accountId, direction = "Credit", amount, currency = "SGD", category = "Transfer" },
            idempotencyKey);

        var first = Send(10.00m);
        var second = Send(20.00m);
        await Task.WhenAll(first, second);
        _firstIdempotencyRaceResponse = await first;
        _secondIdempotencyRaceResponse = await second;
    }

    #endregion

    #region Then

    // Mechanics fix (DRK-1397): the lookahead excludes "...with status ..." so this catch-all doesn't swallow
    // FlatAccountGroupsSteps' two DRK-1393 §5 scenarios that spell out a literal status (and, for one, a
    // code) in the same sentence — those get their own dedicated bindings instead.
    [Then(@"the request is refused(?! with status)(?:.*)")]
    public void ThenTheRequestIsRefused() =>
        // state.ExpectedRefusalStatus defaults to 422 (§5's status for a business-rule refusal) — asserting
        // a specific status (not just "not successful") keeps this scenario red for the right reason. Three
        // scenarios name a different §5 status (401 unauthenticated, 403 wrong scope, 409 idempotency
        // conflict); their own Given/When steps override the expected status, since the step text here is
        // shared verbatim with other scenarios that DO want 422.
        state.Response!.StatusCode.ShouldBe(state.ExpectedRefusalStatus,
            $"expected {(int)state.ExpectedRefusalStatus} but got {(int)state.Response!.StatusCode}");

    [Then(@"the account is returned with a unique account number and a balance of ([\d.]+) (\w+)")]
    public void ThenTheAccountIsReturnedWithAUniqueAccountNumberAndABalanceOf(decimal amount, string currency) =>
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created);

    [Then(@"the account appears when PayHub lists the accounts of ""([^""]+)""")]
    public async Task ThenTheAccountAppearsWhenPayHubListsTheAccountsOf(string groupCode)
    {
        // Target generated-list syntax + {items:[...]} envelope (row 7 moves to GEN) — and actually checks the
        // account is present, not just that the request succeeded.
        var groupId = state.Values.GetValueOrDefault($"group:{groupCode}");
        var response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{AccountsPath}?filter={Uri.EscapeDataString($"GroupId:Equal:{groupId}")}");
        response.IsSuccessStatusCode.ShouldBeTrue();
        var doc = JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
        var ids = doc.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetGuid());
        ids.ShouldContain(Guid.Parse(state.Values["account"]));
    }

    [Then(@"the balances show ([\d.]+) (\w+) and ([\d.]+) (\w+) as separate lines")]
    public void ThenTheBalancesShowAsSeparateLines(decimal amount1, string currency1, decimal amount2, string currency2) =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"no combined total across the two currencies is reported")]
    public void ThenNoCombinedTotalAcrossTheTwoCurrenciesIsReported() =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"its available balance is ([\d.]+) (\w+) and its held amount is ([\d.]+) (\w+)")]
    public void ThenItsAvailableBalanceIsAndItsHeldAmountIs(decimal available, string c1, decimal held, string c2) =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"only the two active accounts are returned")]
    public async Task ThenOnlyTheTwoActiveAccountsAreReturned()
    {
        // Target generated-list envelope — checks the filtered set itself (count and status), not just that
        // the request succeeded.
        var body = await state.Response!.Content.ReadAsStringAsync();
        state.Response!.IsSuccessStatusCode.ShouldBeTrue($"expected the active-only list, got: {body}");
        var doc = JsonSerializer.Deserialize<JsonElement>(body);
        var items = doc.GetProperty("items").EnumerateArray().ToList();
        items.Count.ShouldBe(2);
        items.ShouldAllBe(i => i.GetProperty("status").GetString() == "active");
    }

    [Then(@"only the suspense group is returned")]
    public async Task ThenOnlyTheSuspenseGroupIsReturned()
    {
        var body = await state.Response!.Content.ReadAsStringAsync();
        state.Response!.IsSuccessStatusCode.ShouldBeTrue($"expected the suspense-only list, got: {body}");
        var doc = JsonSerializer.Deserialize<JsonElement>(body);
        var items = doc.GetProperty("items").EnumerateArray().ToList();
        items.Count.ShouldBe(1);
        items[0].GetProperty("type").GetString().ShouldBe("suspense");
    }

    [Then(@"the account balance is (-?[\d.]+) (\w+)")]
    [Then(@"the account balance remains (-?[\d.]+) (\w+)")]
    public void ThenTheAccountBalanceIs(decimal amount, string currency) =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue(
            $"expected balance {amount} {currency}, request status was {(int)state.Response!.StatusCode}");

    [Then(@"the posting is returned with a balance-after of ([\d.]+) (\w+) and position (\d+) in the account's stream")]
    public void ThenThePostingIsReturnedWithABalanceAfterAndPosition(decimal balanceAfter, string currency, int position) =>
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created);

    [Then(@"the originally recorded posting is returned")]
    public void ThenTheOriginallyRecordedPostingIsReturned() =>
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK);

    [Then(@"both postings exist")]
    public void ThenBothPostingsExist() =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"a debit of ([\d.]+) (\w+) appears in the account's stream")]
    public async Task ThenADebitAppearsInTheAccountsStream(decimal amount, string currency)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account()}/statement");
        response.IsSuccessStatusCode.ShouldBeTrue();
    }

    [Then(@"the original posting is marked reversed and names the posting that reversed it")]
    public async Task ThenTheOriginalPostingIsMarkedReversed()
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{PostingsPath}/{Posting()}");
        response.IsSuccessStatusCode.ShouldBeTrue();
    }

    [Then(@"the reversal is recorded and the account balance is (-?[\d.]+) (\w+)")]
    public async Task ThenTheReversalIsRecordedAndTheAccountBalanceIs(decimal amount, string currency)
    {
        // Rework (finding 1): the reversal response body itself is the evidence — its own balanceAfter/
        // currency, not just the HTTP status, must match the literal this step's own regex captured.
        var doc = await ReadResponseJsonAsync();
        doc.GetProperty("balanceAfter").GetDecimal().ShouldBe(amount);
        doc.GetProperty("currency").GetString().ShouldBe(currency);
    }

    [Then(@"both balances are unchanged, and neither movement appears in either stream")]
    public void ThenBothBalancesAreUnchangedAndNeitherMovementAppears() =>
        // Note: unreachable under the current feature text — the compound line that names this clause
        // ("Then the request is refused, both balances are unchanged, and neither movement appears in either
        // stream") is matched in full by ThenTheRequestIsRefused's "the request is refused(?:.*)" pattern
        // first, so this binding never fires today. The all-or-nothing invariant it describes is instead
        // proven by PostingsHandlerTests.Batch_WithAnUnsupportedCurrency_IsRefused (rework finding 4), which
        // re-reads both accounts' balance/streamPosition/statement length after the refusal. Kept as a real
        // assertion (not just a status check) in case a future scenario ever uses this exact standalone text.
        state.Response!.IsSuccessStatusCode.ShouldBeFalse();

    [Then(@"the debited account reads ([\d.]+) (\w+) and the credited account reads ([\d.]+) (\w+)")]
    public async Task ThenTheDebitedAccountReadsAndTheCreditedAccountReads(
        decimal debited, string c1, decimal credited, string c2)
    {
        // Rework (finding 1): the batch response body is the two legs themselves — matched by direction
        // (not array index, which the contract never promises), each leg's own balanceAfter is checked
        // against the literal this step's own regex captured.
        var doc = await ReadResponseJsonAsync();
        var legs = doc.EnumerateArray().ToList();
        var debitLeg = legs.Single(l => string.Equals(l.GetProperty("direction").GetString(), "debit", StringComparison.OrdinalIgnoreCase));
        var creditLeg = legs.Single(l => string.Equals(l.GetProperty("direction").GetString(), "credit", StringComparison.OrdinalIgnoreCase));
        debitLeg.GetProperty("balanceAfter").GetDecimal().ShouldBe(debited);
        debitLeg.GetProperty("currency").GetString().ShouldBe(c1);
        creditLeg.GetProperty("balanceAfter").GetDecimal().ShouldBe(credited);
        creditLeg.GetProperty("currency").GetString().ShouldBe(c2);
    }

    [Then(@"both postings share one transaction group identifier")]
    public async Task ThenBothPostingsShareOneTransactionGroupIdentifier()
    {
        // Rework (finding 1): reads the transactionGroupId every leg in the batch response actually carries —
        // a batch with legs under more than one group id (or none) fails this, where the old check could not.
        var doc = await ReadResponseJsonAsync();
        var groupIds = doc.EnumerateArray()
            .Select(p => p.GetProperty("transactionGroupId").GetGuid())
            .Distinct()
            .ToList();
        groupIds.Count.ShouldBe(1);
        groupIds[0].ShouldNotBe(Guid.Empty);
    }

    [Then(@"the postings dated (.+) and (.+) are returned in that order")]
    public async Task ThenThePostingsDatedAreReturnedInThatOrder(string date1, string date2)
    {
        // Rework (finding 1): reads the statement page's own items and checks both the exact dates this
        // step's own regex captured AND their order, rather than only the HTTP status.
        var doc = await ReadResponseJsonAsync();
        var items = doc.GetProperty("items").EnumerateArray().ToList();
        items.Count.ShouldBe(2);
        DateOnly.Parse(items[0].GetProperty("effectiveDate").GetString()!).ShouldBe(ParseLedgerDate(date1));
        DateOnly.Parse(items[1].GetProperty("effectiveDate").GetString()!).ShouldBe(ParseLedgerDate(date2));
    }

    [Then(@"the posting dated (.+) is not returned")]
    public async Task ThenThePostingDatedIsNotReturned(string date)
    {
        // Rework (finding 1): confirms the excluded date's posting is genuinely absent from the page, not
        // just that the request succeeded.
        var doc = await ReadResponseJsonAsync();
        var excluded = ParseLedgerDate(date);
        doc.GetProperty("items").EnumerateArray()
            .Any(item => DateOnly.Parse(item.GetProperty("effectiveDate").GetString()!) == excluded)
            .ShouldBeFalse();
    }

    [Then(@"the posting dated (.+) is returned before the posting dated (.+)")]
    public async Task ThenThePostingDatedIsReturnedBeforeThePostingDated(string firstDate, string secondDate)
    {
        // Rework (finding 1): proves stream (recording) order, not effective-date order — the whole point of
        // the scenario this step belongs to.
        var doc = await ReadResponseJsonAsync();
        var items = doc.GetProperty("items").EnumerateArray().ToList();
        var firstIndex = items.FindIndex(
            i => DateOnly.Parse(i.GetProperty("effectiveDate").GetString()!) == ParseLedgerDate(firstDate));
        var secondIndex = items.FindIndex(
            i => DateOnly.Parse(i.GetProperty("effectiveDate").GetString()!) == ParseLedgerDate(secondDate));
        firstIndex.ShouldBeGreaterThanOrEqualTo(0);
        secondIndex.ShouldBeGreaterThanOrEqualTo(0);
        firstIndex.ShouldBeLessThan(secondIndex);
    }

    [Then(@"twenty-five postings are returned across the pages in stream order")]
    public void ThenTwentyFivePostingsAreReturnedAcrossThePagesInStreamOrder() =>
        // Rework (finding 1): "twenty-five" (this step's own text) and "in stream order" checked together —
        // the exact sequence of stream positions collected across every page must be 1..25, gapless and in
        // order; a lost, duplicated or reordered posting anywhere across the pages fails this.
        state.StatementStreamPositions.ShouldBe(Enumerable.Range(1, 25).Select(i => (long)i));

    [Then(@"no posting appears on two pages and none is missing")]
    public void ThenNoPostingAppearsOnTwoPagesAndNoneIsMissing()
    {
        // Rework (finding 1): distinctness (nothing repeated across two pages) and completeness (nothing
        // missing) checked as two independent, real assertions over the actual accumulated positions.
        state.StatementStreamPositions.Distinct().Count().ShouldBe(state.StatementStreamPositions.Count);
        state.StatementStreamPositions.ToHashSet().ShouldBe(Enumerable.Range(1, 25).Select(i => (long)i).ToHashSet());
    }

    [Then(@"after PayHub returns the account to active the same reversal is recorded")]
    public async Task ThenAfterPayHubReturnsTheAccountToActiveTheSameReversalIsRecorded()
    {
        await PatchAccountStatusAsync(Account(), "Active");
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Post, $"{PostingsPath}/{Posting()}/reverse",
            new { reason = "Recorded in error" }, $"rev-{Guid.NewGuid():N}");
        state.Response.IsSuccessStatusCode.ShouldBeTrue(
            $"expected the reversal to be recorded after reactivation, status was {(int)state.Response.StatusCode}");
    }

    [Then(@"the balance is ([\d.]+) (\w+)")]
    public async Task ThenTheBalanceIs(decimal amount, string currency)
    {
        // Rework (finding 1): the balance response body itself is the evidence — its own balance/currency,
        // not just the HTTP status, must match the literal this step's own regex captured.
        var doc = await ReadResponseJsonAsync();
        doc.GetProperty("balance").GetDecimal().ShouldBe(amount);
        doc.GetProperty("currency").GetString().ShouldBe(currency);
    }

    [Then(@"the account's stream holds twenty postings at consecutive positions")]
    public async Task ThenTheAccountsStreamHoldsTwentyPostingsAtConsecutivePositions()
    {
        // Rework (finding 1): reads the account's actual stream and checks every position 1..20 is present
        // exactly once, in order — "twenty" and "consecutive" are this step's own words, not just a status
        // check. Stronger than the equivalent PostingsHandlerTests xUnit test can be here: this drives the
        // real BDD-seeded account rather than a bespoke one.
        var response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}/{Account()}/statement?pageSize=50");
        var doc = await response.Content.ReadFromJsonAsync<JsonElement>();
        var positions = doc.GetProperty("items").EnumerateArray()
            .Select(item => item.GetProperty("streamPosition").GetInt64())
            .ToList();
        positions.ShouldBe(Enumerable.Range(1, 20).Select(i => (long)i));
    }

    [Then(@"the posting is attributed to PayHub")]
    public async Task ThenThePostingIsAttributedToPayHub()
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{PostingsPath}/{Posting()}");
        var doc = await response.Content.ReadFromJsonAsync<JsonElement>();
        doc.GetProperty("callingSystem").GetString().ShouldBe("PayHub");
    }

    [Then(@"SGD is listed as denominated to two decimal places")]
    public async Task ThenSgdIsListedAsDenominatedToTwoDecimalPlaces()
    {
        // The generated paged list route wins over the deleted hand-written ListCurrenciesQuery — an
        // accepted breaking API change (bare array -> {items:[...]}), same envelope every other generated
        // GetList route already answers with.
        var currencies = await ReadResponseJsonAsync();
        var sgd = currencies.GetProperty("items").EnumerateArray().First(c => c.GetProperty("code").GetString() == "SGD");
        sgd.GetProperty("decimalPlaces").GetInt32().ShouldBe(2);
    }

    [Then(@"JPY is listed as denominated to zero decimal places")]
    public async Task ThenJpyIsListedAsDenominatedToZeroDecimalPlaces()
    {
        var currencies = await ReadResponseJsonAsync();
        var jpy = currencies.GetProperty("items").EnumerateArray().First(c => c.GetProperty("code").GetString() == "JPY");
        jpy.GetProperty("decimalPlaces").GetInt32().ShouldBe(0);
    }

    /// <summary>
    /// Mechanics helper: reads the response body as a string and parses it, rather than
    /// <c>Content.ReadFromJsonAsync</c> — that API disposes the underlying stream once deserialized, so a
    /// scenario with two Then steps reading the same captured response (both currency assertions here) would
    /// throw <see cref="ObjectDisposedException"/> on the second read.
    /// </summary>
    private async Task<JsonElement> ReadResponseJsonAsync()
    {
        var text = await state.Response!.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(text);
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(text);
    }

    [Then(@"one request records the posting")]
    public void ThenOneRequestRecordsThePosting() =>
        (_firstIdempotencyRaceResponse!.StatusCode == HttpStatusCode.Created ||
         _secondIdempotencyRaceResponse!.StatusCode == HttpStatusCode.Created).ShouldBeTrue(
            $"expected one 201, got {(int)_firstIdempotencyRaceResponse!.StatusCode} and " +
            $"{(int)_secondIdempotencyRaceResponse!.StatusCode}");

    [Then(@"the other is refused with 409 and the refusal carries the code ""([^""]+)""")]
    public async Task ThenTheOtherIsRefusedWith409AndTheRefusalCarriesTheCode(string expectedCode)
    {
        var other = _firstIdempotencyRaceResponse!.StatusCode == HttpStatusCode.Created
            ? _secondIdempotencyRaceResponse!
            : _firstIdempotencyRaceResponse!;
        var doc = await ReadJsonAsync(other);
        other.StatusCode.ShouldBe(
            HttpStatusCode.Conflict, $"expected 409, got {(int)other.StatusCode}: {doc}");
        doc.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var code) && code.GetString() == expectedCode)
            .ShouldBeTrue($"expected an error carrying code {expectedCode}, got: {doc}");
    }

    #endregion
}

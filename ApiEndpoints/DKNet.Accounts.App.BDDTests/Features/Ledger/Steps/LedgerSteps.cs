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

    private async Task<Guid> OpenAccountAsync(
        string currency,
        Guid? groupId = null,
        string classification = "Asset",
        bool permittedToGoNegative = false,
        decimal? overdraftLimit = null,
        decimal? minimumBalance = null,
        string name = "Test Account")
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, AccountsPath, new
        {
            groupId = groupId ?? Guid.NewGuid(),
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

    [Given(@"the group ""([^""]+)"" is a child of the group ""([^""]+)""")]
    public async Task GivenTheGroupIsAChildOfTheGroup(string childCode, string parentCode)
    {
        var parentId = await CreateGroupAsync(parentCode, "Customer");
        await client.SendAsCallerAsync(state, HttpMethod.Post, GroupsPath, new
        {
            code = childCode,
            name = childCode,
            type = "Customer",
            ownerId = state.CallerClientId,
            parentId
        });
    }

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
        await CreateGroupAsync($"GRP-{Guid.NewGuid():N}", commonType);
        await CreateGroupAsync($"GRP-{Guid.NewGuid():N}", commonType);
        await CreateGroupAsync($"GRP-{Guid.NewGuid():N}", distinctType);
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

    [Given(@"PayHub holds an? ([A-Z]{3}) account$")]
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
            state, HttpMethod.Post, $"{PostingsPath}/{Posting()}/reverse");
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
    public async Task GivenTheAccountHasSinceBeenDebitedDownTo(decimal amount, string currency) =>
        await RecordPostingAsync(Account(), "Debit", amount, currency);

    [Given(@"PayHub holds a closed account carrying a posting of ([\d.]+) (\w+)")]
    public async Task GivenPayHubHoldsAClosedAccountCarryingAPostingOf(decimal amount, string currency)
    {
        var accountId = await OpenAccountAsync(currency);
        state.Values["account"] = accountId.ToString();
        var postingId = await RecordPostingAsync(accountId, "Credit", amount, currency);
        state.Values["posting"] = postingId?.ToString() ?? "";
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
        var groupId = Guid.TryParse(state.Values.GetValueOrDefault($"group:{groupCode}"), out var gid) ? gid : Guid.NewGuid();
        var accountId = await OpenAccountAsync(currency, groupId, classification, name: name);
        state.Values["account"] = accountId.ToString();
    }

    [When(@"PayHub opens an account in ""([^""]+)"" permitted to go negative but states no overdraft limit")]
    public async Task WhenPayHubOpensAnAccountPermittedToGoNegativeWithNoOverdraftLimit(string groupCode)
    {
        var groupId = Guid.TryParse(state.Values.GetValueOrDefault($"group:{groupCode}"), out var gid) ? gid : Guid.NewGuid();
        await OpenAccountAsync("SGD", groupId, permittedToGoNegative: true, overdraftLimit: null);
    }

    [When(@"PayHub asks to close that account")]
    public async Task WhenPayHubAsksToCloseThatAccount() =>
        await PatchAccountStatusAsync(Account(), "Closed");

    [When(@"PayHub asks to close ""([^""]+)""")]
    public async Task WhenPayHubAsksToClose(string groupCode)
    {
        var groupId = state.Values.GetValueOrDefault($"group:{groupCode}");
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Patch, $"{GroupsPath}/{groupId}", new { status = "Closed" });
    }

    [When(@"PayHub asks to make ""([^""]+)"" a child of ""([^""]+)""")]
    public async Task WhenPayHubAsksToMakeAChildOf(string childCode, string parentCode)
    {
        var childId = state.Values.GetValueOrDefault($"group:{childCode}");
        var parentId = state.Values.GetValueOrDefault($"group:{parentCode}");
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Patch, $"{GroupsPath}/{childId}", new { parentId });
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
        var groupId = state.Values.GetValueOrDefault($"group:{groupCode}");
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}?groupId={groupId}");
    }

    [When(@"PayHub lists the active accounts of ""([^""]+)""")]
    public async Task WhenPayHubListsTheActiveAccountsOf(string groupCode)
    {
        var groupId = state.Values.GetValueOrDefault($"group:{groupCode}");
        state.Response = await client.SendAsCallerAsync(
            state, HttpMethod.Get, $"{AccountsPath}?groupId={groupId}&status=Active");
    }

    [When(@"PayHub lists the groups of type ""([^""]+)""")]
    public async Task WhenPayHubListsTheGroupsOfType(string type) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{GroupsPath}?type={type}");

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
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{PostingsPath}/{Posting()}/reverse");

    [When(@"PayHub asks to reverse that same posting again")]
    [When(@"PayHub asks to reverse that posting$")]
    [When(@"PayHub asks to reverse that credit$")]
    public async Task WhenPayHubAsksToReverseThatSamePostingAgain() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{PostingsPath}/{Posting()}/reverse");

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
    public async Task WhenPayHubRecordsACreditClaimingToBeLedgerSync(decimal amount, string currency) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId = Account(),
            direction = "Credit",
            amount,
            currency,
            category = "Transfer",
            recordedBy = "LedgerSync"
        });

    [When(@"PayHub reads the supported currencies")]
    public async Task WhenPayHubReadsTheSupportedCurrencies() =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Get, CurrenciesPath);

    #endregion

    #region Then

    [Then(@"the request is refused(?:.*)")]
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
        var groupId = state.Values.GetValueOrDefault($"group:{groupCode}");
        var response = await client.SendAsCallerAsync(state, HttpMethod.Get, $"{AccountsPath}?groupId={groupId}");
        response.IsSuccessStatusCode.ShouldBeTrue();
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
        var body = await state.Response!.Content.ReadAsStringAsync();
        state.Response!.IsSuccessStatusCode.ShouldBeTrue($"expected the active-only list, got: {body}");
    }

    [Then(@"only the suspense group is returned")]
    public async Task ThenOnlyTheSuspenseGroupIsReturned()
    {
        var body = await state.Response!.Content.ReadAsStringAsync();
        state.Response!.IsSuccessStatusCode.ShouldBeTrue($"expected the suspense-only list, got: {body}");
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
    public void ThenTheReversalIsRecordedAndTheAccountBalanceIs(decimal amount, string currency) =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"both balances are unchanged, and neither movement appears in either stream")]
    public void ThenBothBalancesAreUnchangedAndNeitherMovementAppears() =>
        state.Response!.IsSuccessStatusCode.ShouldBeFalse();

    [Then(@"the debited account reads ([\d.]+) (\w+) and the credited account reads ([\d.]+) (\w+)")]
    public void ThenTheDebitedAccountReadsAndTheCreditedAccountReads(
        decimal debited, string c1, decimal credited, string c2) =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"both postings share one transaction group identifier")]
    public void ThenBothPostingsShareOneTransactionGroupIdentifier() =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"the postings dated (.+) and (.+) are returned in that order")]
    public void ThenThePostingsDatedAreReturnedInThatOrder(string date1, string date2) =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"the posting dated (.+) is not returned")]
    public void ThenThePostingDatedIsNotReturned(string date) =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"the posting dated (.+) is returned before the posting dated (.+)")]
    public void ThenThePostingDatedIsReturnedBeforeThePostingDated(string firstDate, string secondDate) =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"twenty-five postings are returned across the pages in stream order")]
    public void ThenTwentyFivePostingsAreReturnedAcrossThePagesInStreamOrder() =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"no posting appears on two pages and none is missing")]
    public void ThenNoPostingAppearsOnTwoPagesAndNoneIsMissing() =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"after PayHub returns the account to active the same reversal is recorded")]
    public async Task ThenAfterPayHubReturnsTheAccountToActiveTheSameReversalIsRecorded()
    {
        await PatchAccountStatusAsync(Account(), "Active");
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{PostingsPath}/{Posting()}/reverse");
        state.Response.IsSuccessStatusCode.ShouldBeTrue(
            $"expected the reversal to be recorded after reactivation, status was {(int)state.Response.StatusCode}");
    }

    [Then(@"the balance is ([\d.]+) (\w+)")]
    public void ThenTheBalanceIs(decimal amount, string currency) =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

    [Then(@"the account's stream holds twenty postings at consecutive positions")]
    public void ThenTheAccountsStreamHoldsTwentyPostingsAtConsecutivePositions() =>
        state.Response!.IsSuccessStatusCode.ShouldBeTrue();

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
        var currencies = await state.Response!.Content.ReadFromJsonAsync<JsonElement>();
        var sgd = currencies.EnumerateArray().First(c => c.GetProperty("code").GetString() == "SGD");
        sgd.GetProperty("decimalPlaces").GetInt32().ShouldBe(2);
    }

    [Then(@"JPY is listed as denominated to zero decimal places")]
    public async Task ThenJpyIsListedAsDenominatedToZeroDecimalPlaces()
    {
        var currencies = await state.Response!.Content.ReadFromJsonAsync<JsonElement>();
        var jpy = currencies.EnumerateArray().First(c => c.GetProperty("code").GetString() == "JPY");
        jpy.GetProperty("decimalPlaces").GetInt32().ShouldBe(0);
    }

    #endregion
}

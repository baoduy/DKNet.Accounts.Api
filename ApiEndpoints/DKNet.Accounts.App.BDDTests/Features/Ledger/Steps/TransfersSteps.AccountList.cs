using System.Globalization;
using System.Text.RegularExpressions;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-2300 §5 "List the transfers of one account". They share the transfer phrases, accounts
/// and ledger calls of DRK-2276's steps, and drive <c>GET /v1/accounts/{id}/transfers</c> over HTTP. A transfer
/// recorded on a past date or at a past moment is recorded through <c>POST /v1/transfers</c> with the host clock
/// pinned there, then the clock goes back to the scenario's "today". Expected values are the literals of the
/// Gherkin.
/// </summary>
[Scope(Feature = "List the transfers of one account")]
public sealed partial class TransfersSteps
{
    private const string ListRoute = "/v{version:apiVersion}/accounts/{id:guid}/transfers";

    private readonly List<JsonElement> _pages = [];
    private DateOnly? _today;
    private bool _listed;

    #region Given

    [Given(@"^PayHub holds ""([^""]+)"" with ([\d.]+) ([A-Z]+), and (.+) with 0\.00$")]
    public async Task GivenPayHubHoldsWithAndWithNothing(string funded, decimal balance, string currency, string others)
    {
        await OpenAccountAsync(funded, currency, "Liability");
        await SetBalanceAsync(funded, balance);
        foreach (Match other in QuotedAccount().Matches(others))
        {
            var name = other.Groups[1].Value;
            await OpenAccountAsync(name, name[^3..], "Liability");
        }
    }

    [Given(@"^today is (\d{4}-\d{2}-\d{2}) in UTC$")]
    public void GivenTodayIsInUtc(string date)
    {
        _today = IsoDate(date);
        sharedHost.Clock.PinToday(_today.Value);
    }

    [Given(@"^treasury-ops transferred (.+)$")]
    public async Task GivenTreasuryOpsTransferred(string transfer)
    {
        state.CallerClientId = "treasury-ops";
        await GivenPayHubTransferred(transfer);
        state.CallerClientId = "PayHub";
    }

    [Given(@"^""([^""]+)"" sent transfers recorded on (.+)$")]
    public async Task GivenSentTransfersRecordedOn(string source, string dates)
    {
        foreach (var date in Dates(dates))
        {
            sharedHost.Clock.PinToday(date);
            await SendToAsync(source, "Bob SGD", 1.00m);
        }

        RestoreClock();
    }

    [Given(@"^""([^""]+)"" sent a transfer recorded at (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) UTC, which is \d{4}-\d{2}-\d{2} in Singapore$")]
    public async Task GivenSentATransferRecordedAt(string source, string date, string time)
    {
        sharedHost.Clock.PinNow(new DateTimeOffset(IsoDate(date), TimeOnly.ParseExact(time, "HH:mm", CultureInfo.InvariantCulture), TimeSpan.Zero));
        _transfer = await SendToAsync(source, "Bob SGD", 1.00m);
        RestoreClock();
    }

    [Given(@"^""([^""]+)"" sent ([\d.]+) SGD, then ([\d.]+) SGD, then ([\d.]+) SGD to ""([^""]+)""$")]
    public async Task GivenSentThenThen(string source, decimal first, decimal second, decimal third, string destination)
    {
        foreach (var amount in new[] { first, second, third })
        {
            await SendToAsync(source, destination, amount);
        }
    }

    [Given(@"^""([^""]+)"" sent these transfers to ""([^""]+)"", in this order: (.+)$")]
    public async Task GivenSentTheseTransfersInThisOrder(string source, string destination, string transfers)
    {
        foreach (Match transfer in AmountWithFee().Matches(transfers))
        {
            await SendToAsync(source, destination, Decimal(transfer.Groups[1].Value), Decimal(transfer.Groups[2].Value));
        }
    }

    [Given(@"^""([^""]+)"" sent (\d+) transfers of ([\d.]+) SGD each to ""([^""]+)""$")]
    public async Task GivenSentTransfersOfEach(string source, int count, decimal amount, string destination)
    {
        for (var i = 0; i < count; i++)
        {
            await SendToAsync(source, destination, amount);
        }
    }

    [Given(@"^""([^""]+)"" sent (\d+) transfers to ""([^""]+)""$")]
    public async Task GivenSentTransfers(string source, int count, string destination) =>
        await GivenSentTransfersOfEach(source, count, 1.00m, destination);

    #endregion

    #region When

    [When(@"^PayHub lists the transfers of (an account id the ledger does not hold|""[^""]+"")(.*)$")]
    public async Task WhenPayHubListsTheTransfersOf(string account, string window)
    {
        var id = account.StartsWith('"') ? _accounts[account.Trim('"')].Id : Guid.NewGuid();
        await ListAsync(id, ListQuery(window));
    }

    [When(@"^PayHub lists page (\d+) of the transfers of ""([^""]+)""$")]
    public async Task WhenPayHubListsPageOfTheTransfersOf(int page, string account) =>
        await ListAsync(_accounts[account].Id, $"?pageNumber={page}");

    [When(@"^PayHub reads every page of the transfers of ""([^""]+)"", sorted by amount, (\d+) per page$")]
    public async Task WhenPayHubReadsEveryPageOfTheTransfersOf(string account, int size)
    {
        // Stops after 10 pages so a list that never reports its last page fails instead of looping forever.
        for (var page = 1; page <= 10; page++)
        {
            await ListAsync(_accounts[account].Id, $"?orderBy=amount&pageNumber={page}&pageSize={size}");
            var body = PageOf();
            _pages.Add(body);
            if (!body.GetProperty("hasNextPage").GetBoolean())
            {
                return;
            }
        }
    }

    [When(@"^PayHub reads the statement of ""([^""]+)""$")]
    public async Task WhenPayHubReadsTheStatementOf(string account)
    {
        var today = DateOnly.FromDateTime(sharedHost.Clock.GetUtcNow().UtcDateTime);
        await SendAsync(HttpMethod.Get,
            $"{AccountsPath}/{_accounts[account].Id}/statement?from={today.AddDays(-1):yyyy-MM-dd}&to={today:yyyy-MM-dd}&pageIndex=1&pageSize=100");
    }

    [When(@"^PayHub lists postings across every account for a window of 91 days$")]
    public async Task WhenPayHubListsPostingsAcrossEveryAccountForAWindowOf91Days() =>
        await SendAsync(HttpMethod.Get, $"{PostingsPath}?from=2026-07-01&to=2026-09-30");

    #endregion

    #region Then

    [Then(@"^the list holds that transfer once$")]
    public void ThenTheListHoldsThatTransferOnce() =>
        Items().Select(t => t.GetProperty("id").GetGuid()).ShouldBe([TransferId]);

    [Then(@"^the list holds that transfer$")]
    public void ThenTheListHoldsThatTransfer() =>
        Items().Select(t => t.GetProperty("id").GetGuid()).ShouldContain(TransferId);

    [Then(@"^the list holds only the ([\d.]+) SGD transfer$")]
    public void ThenTheListHoldsOnlyTheTransfer(decimal amount) =>
        Items().ShouldHaveSingleItem().GetProperty("amount").GetDecimal().ShouldBe(amount);

    [Then(@"^the row shows an amount of ([\d.]+) [A-Z]+, a rate of ([\d.]+), a fee of ([\d.]+) [A-Z]+ and a converted amount of ([\d.]+) [A-Z]+$")]
    public void ThenTheRowShows(string amount, string rate, string fee, string converted)
    {
        // The raw JSON text, because decimal equality ignores scale: 0.74000000 equals 0.74 (R7).
        var row = Items().ShouldHaveSingleItem();
        row.GetProperty("amount").GetRawText().ShouldBe(amount);
        row.GetProperty("exchangeRate").GetRawText().ShouldBe(rate);
        row.GetProperty("fee").GetRawText().ShouldBe(fee);
        row.GetProperty("convertedAmount").GetRawText().ShouldBe(converted);
    }

    [Then(@"^the row shows its source, destination and fee account, its recorded time, its calling system and its idempotency key$")]
    public void ThenTheRowShowsItsAccountsRecordedTimeCallingSystemAndIdempotencyKey()
    {
        var row = Items().ShouldHaveSingleItem();
        row.GetProperty("id").GetGuid().ShouldBe(TransferId);
        row.GetProperty("sourceAccountId").GetGuid().ShouldBe(_accounts["Alice SGD"].Id);
        row.GetProperty("destinationAccountId").GetGuid().ShouldBe(_accounts["Bob USD"].Id);
        row.GetProperty("feeAccountId").GetGuid().ShouldBe(_accounts["Fees SGD"].Id);
        row.GetProperty("sourceCurrency").GetString().ShouldBe("SGD");
        row.GetProperty("destinationCurrency").GetString().ShouldBe("USD");
        row.GetProperty("recordedAt").GetDateTimeOffset().ShouldBe(_transfer.GetProperty("recordedAt").GetDateTimeOffset());
        row.GetProperty("callingSystem").GetString().ShouldBe("PayHub");
        row.GetProperty("idempotencyKey").GetString().ShouldBe(_lastRequest!.Key);
    }

    [Then(@"^the row carries no postings$")]
    public void ThenTheRowCarriesNoPostings() =>
        Items().ShouldHaveSingleItem().TryGetProperty("postings", out _).ShouldBeFalse(state.ResponseBody);

    [Then(@"^PayHub gets an empty page, not an error$")]
    public void ThenPayHubGetsAnEmptyPage() => Items().ShouldBeEmpty();

    [Then(@"^the list holds the transfers recorded on (.+)$")]
    public void ThenTheListHoldsTheTransfersRecordedOn(string dates) =>
        Items().Select(t => DateOnly.FromDateTime(t.GetProperty("recordedAt").GetDateTimeOffset().UtcDateTime))
            .Order()
            .ShouldBe(Dates(dates).Order());

    [Then(@"^the request is refused with INVALID_DATE_RANGE$")]
    public void ThenTheRequestIsRefusedWithInvalidDateRange() =>
        ShouldBeRefusedWithCode(HttpStatusCode.UnprocessableEntity, "INVALID_DATE_RANGE", null);

    [Then(@"^the request is accepted$")]
    public void ThenTheRequestIsAccepted() => _ = Items();

    [Then(@"^the request is refused as invalid \(400\)$")]
    public void ThenTheRequestIsRefusedAsInvalid()
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.BadRequest, state.ResponseBody);
        Errors(Json(state.ResponseBody!))
            .Where(e => e.TryGetProperty("code", out var code) && code.ValueKind != JsonValueKind.Null)
            .ShouldBeEmpty($"a 400 carries no error code, got: {state.ResponseBody}");
    }

    [Then(@"^the (?:transfers|amounts) come in the order (.+?)(?: SGD)?$")]
    public void ThenTheAmountsComeInTheOrder(string amounts) =>
        Items().Select(t => t.GetProperty("amount").GetDecimal())
            .ShouldBe(amounts.Split(", ").Select(Decimal));

    [Then(@"^the (\d+) pages together hold each of the (\d+) transfers exactly once$")]
    public void ThenThePagesTogetherHoldEachTransferExactlyOnce(int pages, int transfers)
    {
        _pages.Count.ShouldBe(pages);
        var ids = _pages.SelectMany(p => p.GetProperty("items").EnumerateArray())
            .Select(t => t.GetProperty("id").GetGuid())
            .ToList();
        ids.Count.ShouldBe(transfers);
        ids.Distinct().Count().ShouldBe(transfers);
    }

    [Then(@"^page 1 reports (\d+) pages, (\d+) transfers in total, a next page and no previous page$")]
    public void ThenPage1Reports(int pages, int total)
    {
        var first = _pages[0];
        first.GetProperty("pageCount").GetInt32().ShouldBe(pages);
        first.GetProperty("totalItemCount").GetInt32().ShouldBe(total);
        first.GetProperty("hasNextPage").GetBoolean().ShouldBeTrue();
        first.GetProperty("hasPreviousPage").GetBoolean().ShouldBeFalse();
    }

    [Then(@"^PayHub gets page (\d+) holding (\d+) transfers, reported with a page size of (\d+)$")]
    public void ThenPayHubGetsPageHoldingTransfers(int page, int count, int size)
    {
        Items().Count.ShouldBe(count);
        var body = PageOf();
        body.GetProperty("pageNumber").GetInt32().ShouldBe(page);
        body.GetProperty("pageSize").GetInt32().ShouldBe(size);
    }

    [Then(@"^the transfer still holds its (\d+) postings$")]
    public void ThenTheTransferStillHoldsItsPostings(int count)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK, state.ResponseBody);
        var read = Json(state.ResponseBody!);
        read.GetProperty("id").GetGuid().ShouldBe(TransferId);
        PostingsOf(read).Count.ShouldBe(count);
    }

    [Then(@"^it lists the ([\d.]+) SGD credit the transfer recorded$")]
    public void ThenItListsTheCreditTheTransferRecorded(decimal amount)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK, state.ResponseBody);
        var credit = Json(state.ResponseBody!).GetProperty("items").EnumerateArray()
            .Where(p => p.TryGetProperty("transactionGroupId", out var group) && group.ValueKind != JsonValueKind.Null
                        && group.GetGuid() == TransferId && Is(p, "direction", "Credit"))
            .ShouldHaveSingleItem();
        credit.GetProperty("amount").GetDecimal().ShouldBe(amount);
        credit.GetProperty("currency").GetString().ShouldBe("SGD");
    }

    #endregion

    #region List calls

    /// <summary>Records <paramref name="amount"/> SGD from <paramref name="source"/> to <paramref name="destination"/>,
    /// with any fee going to "Fees SGD", and returns the transfer the service recorded.</summary>
    private async Task<JsonElement> SendToAsync(string source, string destination, decimal amount, decimal fee = 0m)
    {
        var request = new TransferRequest(
            _accounts[source].Id, _accounts[destination].Id, amount, "SGD", _accounts[destination].Currency, null, fee,
            fee > 0m ? _accounts["Fees SGD"].Id : null, NewKey());
        (await SendTransferAsync(request)).StatusCode.ShouldBe(HttpStatusCode.Created, state.ResponseBody);
        return Json(state.ResponseBody!);
    }

    private void RestoreClock()
    {
        if (_today is { } today)
        {
            sharedHost.Clock.PinToday(today);
        }
        else
        {
            sharedHost.Clock.Reset();
        }
    }

    private async Task ListAsync(Guid accountId, string query)
    {
        _listed = true;
        await SendAsync(HttpMethod.Get, $"{AccountsPath}/{accountId}/transfers{query}");
    }

    private JsonElement PageOf()
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK, state.ResponseBody);
        return Json(state.ResponseBody!);
    }

    private List<JsonElement> Items() => [.. PageOf().GetProperty("items").EnumerateArray()];

    /// <summary>Turns the Gherkin's window, search, sort or paging words into the query string.</summary>
    private static string ListQuery(string words)
    {
        Match m;
        var parameters = new List<string>();
        if (words is "" or " with no dates")
        {
        }
        else if ((m = Regex.Match(words, @"^ from (\S+) with no end$")).Success)
        {
            parameters.Add($"from={m.Groups[1].Value}");
        }
        else if ((m = Regex.Match(words, @"^ to (\S+) with no start$")).Success)
        {
            parameters.Add($"to={m.Groups[1].Value}");
        }
        else if ((m = Regex.Match(words, @"^ from (\S+) to (\S+)$")).Success)
        {
            parameters.Add($"from={m.Groups[1].Value}");
            parameters.Add($"to={m.Groups[2].Value}");
        }
        else if ((m = Regex.Match(words, @"^ searching for ""([^""]*)""$")).Success)
        {
            parameters.Add($"search={Uri.EscapeDataString(m.Groups[1].Value)}");
        }
        else if ((m = Regex.Match(words, @"^ sorted by ""([^""]+)""$")).Success)
        {
            parameters.Add($"orderBy={Uri.EscapeDataString(m.Groups[1].Value)}");
        }
        else if ((m = Regex.Match(words, @"^ sorted by (recorded time|amount|converted amount|fee) (ascending|descending)$")).Success)
        {
            parameters.Add($"orderBy={SortField(m.Groups[1].Value)}");
            if (m.Groups[2].Value == "descending")
            {
                parameters.Add("desc=true");
            }
        }
        else if ((m = Regex.Match(words, @"^ with page number (not set|-?\d+) and page size (not set|-?\d+)$")).Success)
        {
            if (m.Groups[1].Value != "not set")
            {
                parameters.Add($"pageNumber={m.Groups[1].Value}");
            }

            if (m.Groups[2].Value != "not set")
            {
                parameters.Add($"pageSize={m.Groups[2].Value}");
            }
        }
        else
        {
            throw new InvalidOperationException($"unrecognised list words: '{words}'");
        }

        return parameters.Count == 0 ? "" : $"?{string.Join('&', parameters)}";
    }

    /// <summary>§3a's sort fields, as the query names them.</summary>
    private static string SortField(string words) => words switch
    {
        "recorded time" => "recordedAt",
        "amount" => "amount",
        "converted amount" => "convertedAmount",
        "fee" => "fee",
        _ => throw new InvalidOperationException($"unrecognised sort field: {words}")
    };

    private static DateOnly IsoDate(string text) => DateOnly.ParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static IEnumerable<DateOnly> Dates(string text) => IsoDateIn().Matches(text).Select(m => IsoDate(m.Value));

    [GeneratedRegex(@"""([^""]+)""")]
    private static partial Regex QuotedAccount();

    [GeneratedRegex(@"([\d.]+) SGD with a ([\d.]+) SGD fee")]
    private static partial Regex AmountWithFee();

    [GeneratedRegex(@"\d{4}-\d{2}-\d{2}")]
    private static partial Regex IsoDateIn();

    #endregion
}

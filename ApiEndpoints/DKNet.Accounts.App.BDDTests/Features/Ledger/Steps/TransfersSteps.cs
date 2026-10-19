using System.Globalization;
using System.Text.RegularExpressions;
using DKNet.Accounts.Api.Configs.Auth;
using Microsoft.AspNetCore.Routing;
using Npgsql;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-2276 §5 "Transfer money between 2 accounts". Every step drives the HTTP contract of §3a:
/// <c>POST /v1/transfers</c> (key in the <c>Idempotency-Key</c> header) and <c>GET /v1/transfers/{id}</c>, plus the
/// existing account, posting, batch and reversal routes for setup. Expected values are the literals of the
/// Gherkin. "No balance changes" compares every account's balance and stream position, and "no transfer is
/// recorded" the stored transfer count, against a snapshot taken right before the request under test.
/// The events scenario moves to a host of its own with the message bus on (<see cref="OutboundApiFactory"/>) and
/// opens the Background's accounts again there; every other scenario runs on the shared host.
/// </summary>
[Binding]
[Scope(Feature = "Transfer money between 2 accounts")]
public sealed partial class TransfersSteps(HttpClient sharedClient, ScenarioState state, BddApiFactory sharedHost)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string CurrenciesPath = "/v1/currencies";
    private const string PostingsPath = "/v1/postings";
    private const string TransfersPath = "/v1/transfers";

    /// <summary>How long the events scenario waits for an event that must arrive.</summary>
    private static readonly TimeSpan Arrival = TimeSpan.FromSeconds(30);

    /// <summary>How long the events scenario keeps reading before it asserts that no other event arrived.</summary>
    private static readonly TimeSpan Settle = TimeSpan.FromSeconds(3);

    /// <summary>Reads balances for snapshots and checks as PayHub with every scope, whatever credential the
    /// scenario itself is sending under.</summary>
    private readonly ScenarioState _reader = new();

    private readonly Dictionary<string, OpenedAccount> _accounts = [];
    private readonly List<(string Name, decimal Balance, string Currency)> _background = [];
    private Guid? _groupId;

    private OutboundApiFactory? _eventsHost;
    private OutboundQueue? _queue;
    private int _eventsBefore;

    private Snapshot? _before;
    private TransferRequest? _lastRequest;
    private JsonElement _transfer;
    private string? _notFoundField;
    private HttpResponseMessage[] _concurrent = [];
    private bool _recorded;

    private HttpClient Client => _eventsHost?.Client ?? sharedClient;

    private TestApiFactoryBase Host => _eventsHost is null ? sharedHost : _eventsHost;

    private Guid TransferId => _transfer.GetProperty("id").GetGuid();

    #region Hooks

    [AfterScenario]
    public async Task AfterScenarioAsync()
    {
        if (_eventsHost is not null)
        {
            await _eventsHost.DisposeAsync();
            _eventsHost = null;
        }
    }

    #endregion

    #region Given

    [Given(@"^PayHub holds these Liability accounts that may not go negative:$")]
    public async Task GivenPayHubHoldsTheseLiabilityAccounts(Table table)
    {
        foreach (var row in table.Rows)
        {
            var (balance, currency) = Money(row["balance"]);
            _background.Add((row["account"], balance, currency));
        }

        await OpenBackgroundAccountsAsync();
    }

    [Given(@"^""([^""]+)"" is an Asset account holding ([\d.]+) ([A-Z]+)(?: with a floor of|, floor) 0$")]
    public async Task GivenIsAnAssetAccountHolding(string name, decimal balance, string currency)
    {
        // An Asset account not permitted to go negative has a floor of 0.
        await OpenAccountAsync(name, currency, "Asset");
        await SetBalanceAsync(name, balance);
    }

    [Given(@"^PayHub also holds ""([^""]+)"" with ([\d.]+) ([A-Z]+) and ""([^""]+)"" with ([\d.]+) ([A-Z]+)$")]
    public async Task GivenPayHubAlsoHolds(
        string first, decimal firstBalance, string firstCurrency, string second, decimal secondBalance, string secondCurrency)
    {
        await OpenAccountAsync(first, firstCurrency, "Liability");
        await SetBalanceAsync(first, firstBalance);
        await OpenAccountAsync(second, secondCurrency, "Liability");
        await SetBalanceAsync(second, secondBalance);
    }

    [Given(@"^""([^""]+)"" holds ([\d.]+) ([A-Z]+)$")]
    public async Task GivenHolds(string name, decimal balance, string currency)
    {
        _accounts[name].Currency.ShouldBe(currency);
        await SetBalanceAsync(name, balance);
    }

    [Given(@"^""([^""]+)"" is (closed|frozen|dormant)$")]
    public async Task GivenIs(string name, string status)
    {
        if (status == "closed")
        {
            // An account is closed only once it holds nothing (ACCOUNT_HOLDS_BALANCE otherwise).
            await SetBalanceAsync(name, 0m);
        }

        await SucceedsAsync(
            await SendAsync(HttpMethod.Patch, $"{AccountsPath}/{_accounts[name].Id}",
                new { status = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(status) }),
            $"marking {name} {status}");
    }

    [Given(@"^PayHub transferred (.+)$")]
    public async Task GivenPayHubTransferred(string transfer)
    {
        var request = await ParseTransferAsync(transfer);
        var response = await SendTransferAsync(request);
        response.StatusCode.ShouldBe(HttpStatusCode.Created, state.ResponseBody);
        _transfer = Json(state.ResponseBody!);
    }

    [Given(@"^PayHub used the idempotency key ""([^""]+)"" on (.+)$")]
    public async Task GivenPayHubUsedTheIdempotencyKeyOn(string key, string operation)
    {
        var (prepare, act) = ParseOperation(operation);
        await prepare();
        await SucceedsAsync(await act(key), $"{operation} under key {key}");
    }

    [Given(@"^external events are switched on$")]
    public async Task GivenExternalEventsAreSwitchedOn()
    {
        await OutboundBroker.EnsureRunningAsync();
        var database = new NpgsqlConnectionStringBuilder(ApiHooks.Factory.ContainerConnectionString)
        {
            Database = $"transfers_{Guid.NewGuid():N}"
        }.ConnectionString;
        _queue = new OutboundQueue($"ledger-events-{Guid.NewGuid():N}");
        _eventsHost = new OutboundApiFactory(database, new Dictionary<string, string?>
        {
            ["FeatureManagement__EnableServiceBus"] = "true",
            ["MessageBus__Transport"] = "RabbitMq",
            ["MessageBus__OutboundQueue"] = _queue.Name,
            ["ConnectionStrings__RabbitMq"] = OutboundBroker.ConnectionString
        });

        // The Background ran on the shared host: open the same accounts on this one, then let their own events
        // arrive, so only what the transfer sends is read after this point.
        _accounts.Clear();
        _groupId = null;
        var postings = await OpenBackgroundAccountsAsync();
        var accounts = _accounts.Values.Select(a => a.Id).ToList();
        (await _queue.WaitUntilAsync(
                events => accounts.All(id => events.Any(e => e.Type == "accounts.created" && e.PayloadId == id))
                          && postings.All(id => events.Any(e => e.Type == "postings.created" && e.PayloadId == id)),
                Arrival))
            .ShouldBeTrue($"the accounts and balances set up for the scenario never reached the outbound queue. {_queue.Describe()}");
        await _queue.SettleAsync(Settle);
        _eventsBefore = _queue.Received.Count;
    }

    /// <summary>The shared "today is" step reads a different date format; this one reads the ISO date §5 uses.</summary>
    [Given(@"^today is (\d{4}-\d{2}-\d{2})$")]
    public void GivenTodayIs(string date) =>
        sharedHost.Clock.PinToday(DateOnly.ParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture));

    [Given(@"^PayHub's credential carries only (.+)$")]
    public void GivenPayHubsCredentialCarriesOnly(string permission) => state.CallerScopes = [permission];

    #endregion

    #region When

    [When(@"^PayHub transfers (.+)$")]
    public async Task WhenPayHubTransfers(string transfer)
    {
        var request = await ParseTransferAsync(transfer);
        await TakeSnapshotAsync();
        await SendTransferAsync(request);
        if (state.Response!.StatusCode == HttpStatusCode.Created)
        {
            _transfer = Json(state.ResponseBody!);
        }
    }

    [When(@"^PayHub sends a transfer of ([\d.]+) ([A-Z]+) from ""([^""]+)"" to ""([^""]+)"" that leaves out (.+)$")]
    public async Task WhenPayHubSendsATransferThatLeavesOut(
        decimal amount, string currency, string source, string destination, string input)
    {
        var request = new TransferRequest(
            _accounts[source].Id, _accounts[destination].Id, amount, currency, _accounts[destination].Currency,
            null, 0.00m, null, NewKey());
        var body = request.Body();
        string? key = request.Key;
        if (input == "the idempotency key")
        {
            key = null;
        }
        else
        {
            body.Remove(BodyFieldOf(input)).ShouldBeTrue($"no body field stands for {input}");
        }

        await TakeSnapshotAsync();
        await SendAsync(HttpMethod.Post, TransfersPath, body, key);
    }

    [When(@"^PayHub reads that transfer by its id$")]
    public async Task WhenPayHubReadsThatTransferByItsId() =>
        await SendAsync(HttpMethod.Get, $"{TransfersPath}/{TransferId}");

    [When(@"^PayHub sends the same transfer again with the idempotency key ""([^""]+)""$")]
    public async Task WhenPayHubSendsTheSameTransferAgain(string key)
    {
        await TakeSnapshotAsync();
        await SendTransferAsync(_lastRequest! with { Key = key });
    }

    [When(@"^PayHub sends (?!the same transfer again)(.+) with the idempotency key ""([^""]+)""$")]
    public async Task WhenPayHubSendsWithTheIdempotencyKey(string operation, string key)
    {
        var (prepare, act) = ParseOperation(operation);
        await prepare();
        await TakeSnapshotAsync();
        await act(key);
    }

    [When(@"^PayHub reads a transfer id that does not exist$")]
    [When(@"^PayHub reads a transfer$")]
    public async Task WhenPayHubReadsATransferIdThatDoesNotExist()
    {
        _recorded = false;
        await SendAsync(HttpMethod.Get, $"{TransfersPath}/{Guid.NewGuid()}");
    }

    [When(@"^PayHub records a transfer$")]
    public async Task WhenPayHubRecordsATransfer()
    {
        _recorded = true;
        await TakeSnapshotAsync();
        await SendTransferAsync(await ParseTransferAsync(@"50.00 SGD from ""Alice SGD"" to ""Carol SGD"" with a 0.00 SGD fee"));
    }

    [When(@"^treasury-ops reverses the transfer's fee credit on ""([^""]+)""$")]
    public async Task WhenTreasuryOpsReversesTheTransfersFeeCredit(string account)
    {
        var feeCredit = PostingsOf(_transfer).Single(p =>
            p.GetProperty("accountId").GetGuid() == _accounts[account].Id && Is(p, "direction", "Credit") && Is(p, "category", "Fee"));

        state.CallerClientId = "treasury-ops";
        await SucceedsAsync(
            await SendAsync(HttpMethod.Post, $"{PostingsPath}/{feeCredit.GetProperty("id").GetGuid()}/reverse",
                new { reason = "Fee charged in error" }, NewKey()),
            "reversing the fee credit");
        state.CallerClientId = "PayHub";
    }

    [When(@"^PayHub sends (\d+) transfers of (.+) at the same time$")]
    public async Task WhenPayHubSendsTransfersAtTheSameTime(int count, string transfer)
    {
        var request = await ParseTransferAsync(transfer);
        await TakeSnapshotAsync();
        _concurrent = await Task.WhenAll(Enumerable.Range(0, count)
            .Select(_ => Client.SendAsCallerAsync(state, HttpMethod.Post, TransfersPath, request.Body(), NewKey())));
    }

    [When(@"^PayHub records a batch debiting ([\d.]+) ([A-Z]+) from ""([^""]+)"" and crediting ([\d.]+) ([A-Z]+) to ""([^""]+)""$")]
    public async Task WhenPayHubRecordsABatch(
        decimal debit, string debitCurrency, string debited, decimal credit, string creditCurrency, string credited) =>
        await RecordBatchAsync(debited, debit, debitCurrency, credited, credit, creditCurrency, NewKey());

    #endregion

    #region Then

    [Then(@"^(""[^""]+"" (?:still )?reads -?[\d.]+ [A-Z]+(?:(?:, | and )""[^""]+"" (?:still )?reads -?[\d.]+ [A-Z]+)*)$")]
    public async Task ThenReads(string readings)
    {
        foreach (Match reading in Reading().Matches(readings))
        {
            var (balance, _) = await BalanceAsync(reading.Groups[1].Value);
            balance.ShouldBe(
                decimal.Parse(reading.Groups[2].Value, CultureInfo.InvariantCulture),
                $"{reading.Groups[1].Value} reads the wrong balance");
            _accounts[reading.Groups[1].Value].Currency.ShouldBe(reading.Groups[3].Value);
        }
    }

    [Then(@"^PayHub gets back the new transfer with its (\d+) postings$")]
    public async Task ThenPayHubGetsBackTheNewTransfer(int postings)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created, state.ResponseBody);
        _transfer.GetProperty("id").GetGuid().ShouldNotBe(Guid.Empty);
        _transfer.GetProperty("sourceAccountId").GetGuid().ShouldBe(_lastRequest!.Source);
        _transfer.GetProperty("destinationAccountId").GetGuid().ShouldBe(_lastRequest.Destination);
        PostingsOf(_transfer).Count.ShouldBe(postings);
        PostingsOf(_transfer).ShouldAllBe(p => p.GetProperty("transactionGroupId").GetGuid() == TransferId);

        // The presence sibling of every "no transfer is recorded" below.
        (await TransferCountAsync()).ShouldBe(1L);
    }

    [Then(@"^the transfer shows an amount of ([\d.]+) ([A-Z]+), a rate of ([\d.]+), a fee of ([\d.]+) ([A-Z]+) and a converted amount of ([\d.]+) ([A-Z]+)$")]
    public void ThenTheTransferShows(
        decimal amount, string sourceCurrency, decimal rate, decimal fee, string feeCurrency, decimal converted, string destinationCurrency)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK, state.ResponseBody);
        var read = Json(state.ResponseBody!);
        read.GetProperty("id").GetGuid().ShouldBe(TransferId);
        ShouldShow(read, amount, sourceCurrency, fee, feeCurrency, converted, destinationCurrency);
        read.GetProperty("exchangeRate").GetDecimal().ShouldBe(rate);
        _transfer = read;
    }

    [Then(@"^it holds these postings, each carrying the transfer's id as its transaction group:$")]
    public void ThenItHoldsThesePostings(Table table)
    {
        var postings = PostingsOf(_transfer);
        postings.Count.ShouldBe(table.RowCount, _transfer.ToString());
        for (var i = 0; i < table.RowCount; i++)
        {
            var row = table.Rows[i];
            var posting = postings[i];
            var (amount, currency) = Money(row["amount"]);
            posting.GetProperty("accountId").GetGuid().ShouldBe(_accounts[row["account"]].Id, $"posting {i + 1}: {posting}");
            Is(posting, "direction", row["direction"]).ShouldBeTrue($"posting {i + 1}: {posting}");
            posting.GetProperty("amount").GetDecimal().ShouldBe(amount, $"posting {i + 1}: {posting}");
            posting.GetProperty("currency").GetString().ShouldBe(currency, $"posting {i + 1}: {posting}");
            Is(posting, "category", row["category"]).ShouldBeTrue($"posting {i + 1}: {posting}");
            posting.GetProperty("transactionGroupId").GetGuid().ShouldBe(TransferId, $"posting {i + 1}: {posting}");
        }
    }

    [Then(@"^the transfer holds (\d+) postings and no fee posting$")]
    public void ThenTheTransferHoldsPostingsAndNoFeePosting(int count)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created, state.ResponseBody);
        var postings = PostingsOf(_transfer);
        postings.Count.ShouldBe(count, _transfer.ToString());
        postings.ShouldAllBe(p => Is(p, "category", "Transfer"));
    }

    [Then(@"^the transfer is refused with (.+)$")]
    public async Task ThenTheTransferIsRefusedWith(string refusal)
    {
        var match = Refusal().Match(refusal);
        match.Success.ShouldBeTrue($"unrecognised refusal: {refusal}");
        var code = match.Groups["code"].Value;
        var field = match.Groups["field"].Value;
        if (code == "not found (404)")
        {
            ShouldBeNotFoundNaming(_notFoundField!);
        }
        else
        {
            var expectedField = field.Length == 0 ? null : ErrorFieldOf(field);
            ShouldBeRefusedWithCode(HttpStatusCode.UnprocessableEntity, code, expectedField);
        }

        if (match.Groups["nothing"].Success)
        {
            await NothingChangedAsync();
        }
    }

    [Then(@"^the request is refused as invalid \(400\), naming (.+), no balance changes and no transfer is recorded$")]
    public async Task ThenTheRequestIsRefusedAsInvalidNaming(string input)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.BadRequest, state.ResponseBody);
        var expectedField = input == "the idempotency key" ? "IdempotencyKey" : ErrorFieldOf(input);
        Errors(Json(state.ResponseBody!))
            .Any(e => e.TryGetProperty("field", out var f) && f.GetString() == expectedField)
            .ShouldBeTrue($"expected a '{expectedField}' field error, got: {state.ResponseBody}");
        await NothingChangedAsync();
    }

    [Then(@"^every posting of the transfer has the effective date (\d{4}-\d{2}-\d{2})$")]
    public void ThenEveryPostingHasTheEffectiveDate(string date)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created, state.ResponseBody);
        var postings = PostingsOf(_transfer);
        postings.ShouldNotBeEmpty();
        postings.ShouldAllBe(p => p.GetProperty("effectiveDate").GetString() == date);
    }

    [Then(@"^PayHub gets the original transfer back$")]
    public async Task ThenPayHubGetsTheOriginalTransferBack()
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK, state.ResponseBody);
        var replay = Json(state.ResponseBody!);
        replay.GetProperty("id").GetGuid().ShouldBe(TransferId);
        replay.GetProperty("amount").GetDecimal().ShouldBe(_transfer.GetProperty("amount").GetDecimal());
        replay.GetProperty("convertedAmount").GetDecimal().ShouldBe(_transfer.GetProperty("convertedAmount").GetDecimal());
        PostingsOf(replay).Select(p => p.GetProperty("id").GetGuid())
            .ShouldBe(PostingsOf(_transfer).Select(p => p.GetProperty("id").GetGuid()));
        await NothingChangedAsync();
    }

    [Then(@"^the request is refused with ([A-Z_]+), and nothing new is recorded$")]
    public async Task ThenTheRequestIsRefusedWithAndNothingNewIsRecorded(string code)
    {
        ShouldBeRefusedWithCode(HttpStatusCode.Conflict, code, null);
        await NothingChangedAsync();
    }

    [Then(@"^(\d+) postings\.created events are sent, 1 per posting, and no other event$")]
    public async Task ThenPostingsCreatedEventsAreSent(int count)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created, state.ResponseBody);
        var postings = PostingsOf(_transfer).Select(p => p.GetProperty("id").GetGuid()).ToList();
        postings.Count.ShouldBe(count);

        (await _queue!.WaitUntilAsync(
                _ => postings.All(id => SinceTransfer().Any(e => e.Type == "postings.created" && e.PayloadId == id)), Arrival))
            .ShouldBeTrue($"expected a postings.created event per posting. {_queue.Describe()}");
        await _queue.SettleAsync(Settle);

        // Delivery is at least once: a copy carries the same message id, so events are counted by message id.
        var sent = SinceTransfer().DistinctBy(e => e.MessageId ?? e.Body).ToList();
        sent.ShouldAllBe(e => e.Type == "postings.created", _queue.Describe());
        sent.Select(e => e.PayloadId!.Value).OrderBy(id => id).ShouldBe(postings.OrderBy(id => id));
    }

    [Then(@"^the answer is not found \(404\)$")]
    public void ThenTheAnswerIsNotFound()
    {
        // Proves the 404 came from the transfer route, not from a route that does not exist.
        RouteShouldExist("GET", "/v{version:apiVersion}/transfers/{id:guid}");
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.NotFound, state.ResponseBody);
    }

    [Then(@"^the request is refused as forbidden \(403\)$")]
    public async Task ThenTheRequestIsRefusedAsForbidden()
    {
        // Proves the 403 came from the transfer route's own permission, not from a route that does not exist.
        if (_recorded)
        {
            RouteShouldExist("POST", "/v{version:apiVersion}/transfers/");
            await NothingChangedAsync();
        }
        else if (_listed)
        {
            RouteShouldExist("GET", ListRoute);
        }
        else
        {
            RouteShouldExist("GET", "/v{version:apiVersion}/transfers/{id:guid}");
        }

        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Forbidden, state.ResponseBody);
    }

    [Then(@"^the transfer and each of its postings name (\w+) as the calling system$")]
    public void ThenTheTransferAndEachOfItsPostingsName(string callingSystem)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created, state.ResponseBody);
        _transfer.GetProperty("callingSystem").GetString().ShouldBe(callingSystem);
        var postings = PostingsOf(_transfer);
        postings.ShouldNotBeEmpty();
        postings.ShouldAllBe(p => p.GetProperty("callingSystem").GetString() == callingSystem);
    }

    [Then(@"^the transfer still shows an amount of ([\d.]+) ([A-Z]+), a fee of ([\d.]+) ([A-Z]+) and a converted amount of ([\d.]+) ([A-Z]+)$")]
    public async Task ThenTheTransferStillShows(
        decimal amount, string sourceCurrency, decimal fee, string feeCurrency, decimal converted, string destinationCurrency)
    {
        await SendAsync(HttpMethod.Get, $"{TransfersPath}/{TransferId}");
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK, state.ResponseBody);
        ShouldShow(Json(state.ResponseBody!), amount, sourceCurrency, fee, feeCurrency, converted, destinationCurrency);
    }

    [Then(@"^it still lists exactly its (\d+) original postings$")]
    public void ThenItStillListsExactlyItsOriginalPostings(int count)
    {
        var original = PostingsOf(_transfer).Select(p => p.GetProperty("id").GetGuid()).ToList();
        original.Count.ShouldBe(count);
        PostingsOf(Json(state.ResponseBody!)).Select(p => p.GetProperty("id").GetGuid()).ShouldBe(original);
    }

    [Then(@"^exactly 1 transfer is recorded and the other is refused with ([A-Z_]+)$")]
    public async Task ThenExactlyOneTransferIsRecordedAndTheOtherIsRefused(string code)
    {
        var statuses = _concurrent.Select(r => r.StatusCode).ToList();
        statuses.Count(s => s == HttpStatusCode.Created).ShouldBe(1, string.Join(", ", statuses));
        var refused = _concurrent.Single(r => r.StatusCode != HttpStatusCode.Created);
        state.Response = refused;
        state.ResponseBody = await refused.Content.ReadAsStringAsync();
        ShouldBeRefusedWithCode(HttpStatusCode.UnprocessableEntity, code, null);
        (await TransferCountAsync()).ShouldBe(1L);
    }

    [Then(@"^""([^""]+)"" reads ([\d.]+) ([A-Z]+), and its posting stream has no gaps$")]
    public async Task ThenReadsAndItsPostingStreamHasNoGaps(string name, decimal expected, string currency)
    {
        var (balance, streamPosition) = await BalanceAsync(name);
        balance.ShouldBe(expected);
        _accounts[name].Currency.ShouldBe(currency);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var statement = await SucceedsAsync(
            await SendAsync(HttpMethod.Get,
                $"{AccountsPath}/{_accounts[name].Id}/statement?from={today.AddDays(-1):yyyy-MM-dd}&to={today:yyyy-MM-dd}&pageIndex=1&pageSize=100"),
            $"reading the statement of {name}");
        statement.GetProperty("items").EnumerateArray()
            .Select(p => p.GetProperty("streamPosition").GetInt64())
            .Order()
            .ShouldBe(Enumerable.Range(1, (int)streamPosition).Select(p => (long)p));
    }

    #endregion

    #region Transfer phrases

    /// <summary>The body of one transfer request (§3a). Null fields are left out of the body.</summary>
    private sealed record TransferRequest(
        Guid Source,
        Guid Destination,
        decimal Amount,
        string SourceCurrency,
        string DestinationCurrency,
        decimal? ExchangeRate,
        decimal Fee,
        Guid? FeeAccount,
        string? Key)
    {
        public Dictionary<string, object?> Body()
        {
            var body = new Dictionary<string, object?>
            {
                ["sourceAccountId"] = Source,
                ["destinationAccountId"] = Destination,
                ["amount"] = Amount,
                ["sourceCurrency"] = SourceCurrency,
                ["destinationCurrency"] = DestinationCurrency,
                ["fee"] = Fee
            };
            if (ExchangeRate is not null)
            {
                body["exchangeRate"] = ExchangeRate;
            }

            if (FeeAccount is not null)
            {
                body["feeAccountId"] = FeeAccount;
            }

            return body;
        }
    }

    /// <summary>
    /// Reads one transfer as the Gherkin words it: <c>100.00 SGD from "A" to "B"</c>, then optionally
    /// <c> at a rate of R</c> and <c> with a F SGD fee</c>, then one tail — <c> to "Fees"</c>, <c> and no rate</c>,
    /// <c> and a rate of R</c>, <c> and "Fees"</c>, <c> and no fee account</c>, <c> and an unknown account</c>,
    /// <c> with the idempotency key "K"</c>, <c> under the idempotency key "K"</c> or <c>, but &lt;change&gt;</c>. A
    /// transfer that names no fee carries a fee of 0; the destination currency is the destination account's.
    /// </summary>
    private async Task<TransferRequest> ParseTransferAsync(string text)
    {
        var match = TransferPhrase().Match(text);
        match.Success.ShouldBeTrue($"unrecognised transfer: {text}");

        var source = _accounts[match.Groups["src"].Value];
        var destination = _accounts[match.Groups["dst"].Value];
        var request = new TransferRequest(
            source.Id,
            destination.Id,
            Decimal(match.Groups["amount"].Value),
            match.Groups["cur"].Value,
            destination.Currency,
            match.Groups["rate"].Success ? Decimal(match.Groups["rate"].Value) : null,
            match.Groups["fee"].Success ? Decimal(match.Groups["fee"].Value) : 0m,
            null,
            NewKey());

        var tail = match.Groups["tail"].Value;
        Match t;
        if (tail.Length == 0 || tail == " and no rate" || tail == " and no fee account")
        {
            return request;
        }

        if ((t = FeeAccountTail().Match(tail)).Success)
        {
            return request with { FeeAccount = _accounts[t.Groups[1].Value].Id };
        }

        if ((t = RateTail().Match(tail)).Success)
        {
            return request with { ExchangeRate = Decimal(t.Groups[1].Value) };
        }

        if (tail == " and an unknown account")
        {
            _notFoundField = "feeAccountId";
            return request with { FeeAccount = Guid.NewGuid() };
        }

        if ((t = KeyTail().Match(tail)).Success)
        {
            return request with { Key = t.Groups[1].Value };
        }

        if ((t = ChangeTail().Match(tail)).Success)
        {
            return await ApplyChangeAsync(request, t.Groups[1].Value);
        }

        throw new InvalidOperationException($"unrecognised transfer tail: '{tail}' in {text}");
    }

    private async Task<TransferRequest> ApplyChangeAsync(TransferRequest request, string change)
    {
        Match m;
        if ((m = Regex.Match(change, @"^the destination is ""([^""]+)"" in ([A-Z]+), no rate$")).Success)
        {
            return request with { Destination = _accounts[m.Groups[1].Value].Id, DestinationCurrency = m.Groups[2].Value, ExchangeRate = null };
        }

        if ((m = Regex.Match(change, @"^the source currency is given as ([A-Z]+)$")).Success)
        {
            return request with { SourceCurrency = m.Groups[1].Value };
        }

        if ((m = Regex.Match(change, @"^the destination currency is given as ([A-Z]+)$")).Success)
        {
            return request with { DestinationCurrency = m.Groups[1].Value };
        }

        if ((m = Regex.Match(change, @"^the amount is ([\d.]+) [A-Z]+$")).Success)
        {
            return request with { Amount = Decimal(m.Groups[1].Value) };
        }

        if ((m = Regex.Match(change, @"^the destination is ""([^""]+)"", whose ([A-Z]+) is inactive$")).Success)
        {
            // Spec note: register the currency, open the account in it, then deactivate the currency.
            var name = m.Groups[1].Value;
            var code = m.Groups[2].Value;
            var currency = await SucceedsAsync(
                await SendAsync(HttpMethod.Post, CurrenciesPath, new { code, name = $"{code} test currency", decimalPlaces = 2 }),
                $"registering {code}");
            await OpenAccountAsync(name, code, "Liability");
            await SucceedsAsync(
                await SendAsync(HttpMethod.Post, $"{CurrenciesPath}/{currency.GetProperty("id").GetGuid()}/deactivate"),
                $"deactivating {code}");
            return request with { Destination = _accounts[name].Id, DestinationCurrency = code };
        }

        if (change == "the source account does not exist")
        {
            _notFoundField = "sourceAccountId";
            return request with { Source = Guid.NewGuid() };
        }

        if (change == "the destination account does not exist")
        {
            _notFoundField = "destinationAccountId";
            return request with { Destination = Guid.NewGuid() };
        }

        throw new InvalidOperationException($"unrecognised change: {change}");
    }

    /// <summary>
    /// One operation of the "used once per calling system" outline: a preparation that must succeed and is not
    /// part of what is measured (the debit a reversal reverses), and the act sent under the given key.
    /// </summary>
    private (Func<Task> Prepare, Func<string, Task<HttpResponseMessage>> Act) ParseOperation(string text)
    {
        Match m;
        if ((m = Regex.Match(text, @"^a ([\d.]+) ([A-Z]+) transfer from ""([^""]+)"" to ""([^""]+)""$")).Success)
        {
            var match = m;
            return (() => Task.CompletedTask, async key => await SendTransferAsync(new TransferRequest(
                _accounts[match.Groups[3].Value].Id, _accounts[match.Groups[4].Value].Id, Decimal(match.Groups[1].Value),
                match.Groups[2].Value, _accounts[match.Groups[4].Value].Currency, null, 0m, null, key)));
        }

        if ((m = Regex.Match(text, @"^a single ([\d.]+) ([A-Z]+) debit on ""([^""]+)""$")).Success)
        {
            var match = m;
            return (() => Task.CompletedTask, key => RecordPostingAsync(
                _accounts[match.Groups[3].Value].Id, "Debit", Decimal(match.Groups[1].Value), match.Groups[2].Value, key));
        }

        if ((m = Regex.Match(text, @"^a batch moving ([\d.]+) ([A-Z]+) from ""([^""]+)"" to ""([^""]+)""$")).Success)
        {
            var match = m;
            var amount = Decimal(match.Groups[1].Value);
            var currency = match.Groups[2].Value;
            return (() => Task.CompletedTask, key => RecordBatchAsync(
                match.Groups[3].Value, amount, currency, match.Groups[4].Value, amount, currency, key));
        }

        if ((m = Regex.Match(text, @"^the reversal of a ([\d.]+) ([A-Z]+) debit on ""([^""]+)""$")).Success)
        {
            var match = m;
            Guid debit = default;
            return (async () =>
                {
                    var posting = await SucceedsAsync(
                        await RecordPostingAsync(_accounts[match.Groups[3].Value].Id, "Debit", Decimal(match.Groups[1].Value),
                            match.Groups[2].Value, NewKey()),
                        "recording the debit to reverse");
                    debit = posting.GetProperty("id").GetGuid();
                },
                key => SendAsync(HttpMethod.Post, $"{PostingsPath}/{debit}/reverse", new { reason = "Recorded in error" }, key));
        }

        throw new InvalidOperationException($"unrecognised operation: {text}");
    }

    #endregion

    #region Ledger calls

    private sealed record OpenedAccount(Guid Id, string Currency, string Classification);

    private sealed record Snapshot(IReadOnlyDictionary<string, (decimal Balance, long StreamPosition)> Accounts, long? Transfers);

    private async Task<HttpResponseMessage> SendAsync(
        HttpMethod method, string uri, object? body = null, string? idempotencyKey = null)
    {
        var response = await Client.SendAsCallerAsync(state, method, uri, body, idempotencyKey);
        state.Response = response;
        state.ResponseBody = await response.Content.ReadAsStringAsync();
        return response;
    }

    private async Task<HttpResponseMessage> SendTransferAsync(TransferRequest request)
    {
        _lastRequest = request;
        return await SendAsync(HttpMethod.Post, TransfersPath, request.Body(), request.Key);
    }

    private Task<HttpResponseMessage> RecordPostingAsync(Guid accountId, string direction, decimal amount, string currency, string key) =>
        SendAsync(HttpMethod.Post, PostingsPath,
            new { accountId, direction, amount, currency, category = "Transfer" }, key);

    private Task<HttpResponseMessage> RecordBatchAsync(
        string debited, decimal debit, string debitCurrency, string credited, decimal credit, string creditCurrency, string key) =>
        SendAsync(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = _accounts[debited].Id, direction = "Debit", amount = debit, currency = debitCurrency, category = "Transfer" },
                new { accountId = _accounts[credited].Id, direction = "Credit", amount = credit, currency = creditCurrency, category = "Transfer" }
            }
        }, key);

    private static async Task<JsonElement> SucceedsAsync(HttpResponseMessage response, string what)
    {
        var body = await response.Content.ReadAsStringAsync();
        response.IsSuccessStatusCode.ShouldBeTrue($"{what} answered {(int)response.StatusCode}: {body}");
        return Json(body);
    }

    /// <summary>Opens the Background's accounts on the current host. Returns the postings that set their
    /// balances.</summary>
    private async Task<List<Guid>> OpenBackgroundAccountsAsync()
    {
        var postings = new List<Guid>();
        foreach (var (name, balance, currency) in _background)
        {
            await OpenAccountAsync(name, currency, "Liability");
            if (await SetBalanceAsync(name, balance) is { } posting)
            {
                postings.Add(posting);
            }
        }

        return postings;
    }

    private async Task OpenAccountAsync(string name, string currency, string classification)
    {
        _groupId ??= (await SucceedsAsync(
                await SendAsync(HttpMethod.Post, GroupsPath, new { code = "TRF", name = "Transfers", type = "Customer", ownerId = "PayHub" }),
                "creating the account group"))
            .GetProperty("id").GetGuid();

        var account = await SucceedsAsync(
            await SendAsync(HttpMethod.Post, AccountsPath, new
            {
                groupId = _groupId,
                name,
                currency,
                classification,
                permittedToGoNegative = false
            }),
            $"opening {name}");
        _accounts[name] = new OpenedAccount(account.GetProperty("id").GetGuid(), currency, classification);
    }

    /// <summary>Moves the account's balance to <paramref name="target"/> with one posting: on a Liability a credit
    /// raises the balance, on an Asset a debit does. Returns that posting, or null when none was needed.</summary>
    private async Task<Guid?> SetBalanceAsync(string name, decimal target)
    {
        var account = _accounts[name];
        var (balance, _) = await BalanceAsync(name);
        if (balance == target)
        {
            return null;
        }

        var raise = target > balance;
        var direction = (account.Classification == "Asset") == raise ? "Debit" : "Credit";
        var posting = await SucceedsAsync(
            await RecordPostingAsync(account.Id, direction, Math.Abs(target - balance), account.Currency, NewKey()),
            $"bringing {name} to {target}");
        return posting.GetProperty("id").GetGuid();
    }

    private async Task<(decimal Balance, long StreamPosition)> BalanceAsync(string name)
    {
        var account = await SucceedsAsync(
            await Client.SendAsCallerAsync(_reader, HttpMethod.Get, $"{AccountsPath}/{_accounts[name].Id}"),
            $"reading {name}");
        return (account.GetProperty("balance").GetDecimal(), account.GetProperty("streamPosition").GetInt64());
    }

    /// <summary>Taken right before the request under test, after every preparation it needs.</summary>
    private async Task TakeSnapshotAsync()
    {
        var accounts = new Dictionary<string, (decimal, long)>();
        foreach (var name in _accounts.Keys)
        {
            accounts[name] = await BalanceAsync(name);
        }

        _before = new Snapshot(accounts, await TransferCountAsync());
    }

    private async Task NothingChangedAsync()
    {
        var response = (state.Response, state.ResponseBody);
        foreach (var (name, before) in _before!.Accounts)
        {
            (await BalanceAsync(name)).ShouldBe(before, $"{name} changed");
        }

        var transfers = await TransferCountAsync();
        transfers.ShouldNotBeNull("no Transfer entity is mapped, so no transfer can be counted");
        transfers.ShouldBe(_before.Transfers, "a transfer was recorded");
        (state.Response, state.ResponseBody) = response;
    }

    /// <summary>The stored transfers, counted in the table EF maps the <c>Transfer</c> entity to (§3 rows 1–2);
    /// null while no such entity is mapped.</summary>
    private async Task<long?> TransferCountAsync()
    {
        using var scope = Host.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var transfer = db.Model.GetEntityTypes().SingleOrDefault(e => e.ClrType.Name == "Transfer");
        if (transfer is null)
        {
            return null;
        }

        var table = $"\"{transfer.GetSchema() ?? "public"}\".\"{transfer.GetTableName()}\"";
        return await db.Database.SqlQueryRaw<long>($"SELECT COUNT(*) AS \"Value\" FROM {table}").SingleAsync();
    }

    #endregion

    #region Assertions

    private void ShouldBeRefusedWithCode(HttpStatusCode status, string code, string? field)
    {
        state.Response!.StatusCode.ShouldBe(status, state.ResponseBody);
        Errors(Json(state.ResponseBody!))
            .Any(e => e.TryGetProperty("code", out var c) && c.GetString() == code
                      && (field is null || (e.TryGetProperty("field", out var f) && f.GetString() == field)))
            .ShouldBeTrue($"expected an error carrying code {code}{(field is null ? "" : $" on {field}")}, got: {state.ResponseBody}");
    }

    /// <summary>§9 Q1: a 404 carries no error field, so the message names the account field instead. A route that
    /// does not exist answers 404 with no such message.</summary>
    private void ShouldBeNotFoundNaming(string field)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.NotFound, state.ResponseBody);
        var body = state.ResponseBody ?? "";
        var messages = body.Length == 0 ? [] : Messages(Json(body)).ToList();
        messages.Any(m => m.Contains(field, StringComparison.Ordinal))
            .ShouldBeTrue($"expected the not-found message to name {field}, got: {body}");
    }

    private static void ShouldShow(
        JsonElement transfer, decimal amount, string sourceCurrency, decimal fee, string feeCurrency, decimal converted, string destinationCurrency)
    {
        transfer.GetProperty("amount").GetDecimal().ShouldBe(amount);
        transfer.GetProperty("sourceCurrency").GetString().ShouldBe(sourceCurrency);
        transfer.GetProperty("fee").GetDecimal().ShouldBe(fee);
        feeCurrency.ShouldBe(sourceCurrency, "the fee is in the source currency");
        transfer.GetProperty("convertedAmount").GetDecimal().ShouldBe(converted);
        transfer.GetProperty("destinationCurrency").GetString().ShouldBe(destinationCurrency);
    }

    private void RouteShouldExist(string method, string pattern) =>
        Host.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .Any(e => e.RoutePattern.RawText == pattern
                      && (e.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods.Contains(method) ?? false))
            .ShouldBeTrue($"no {method} {pattern} route exists");

    private IEnumerable<OutboundEvent> SinceTransfer() => _queue!.Received.Skip(_eventsBefore);

    #endregion

    #region Parsing

    /// <summary>§3a's request fields, as the 400 names them (the validator's property names).</summary>
    private static string ErrorFieldOf(string input) => input switch
    {
        "rate" => "ExchangeRate",
        "fee" or "the fee" => "Fee",
        "fee account" => "FeeAccountId",
        "the source account" => "SourceAccountId",
        "the destination account" => "DestinationAccountId",
        "the amount" => "Amount",
        "the source currency" => "SourceCurrency",
        "the destination currency" => "DestinationCurrency",
        _ => throw new InvalidOperationException($"unrecognised field: {input}")
    };

    private static string BodyFieldOf(string input)
    {
        var field = ErrorFieldOf(input);
        return char.ToLowerInvariant(field[0]) + field[1..];
    }

    private static (decimal Amount, string Currency) Money(string text)
    {
        var parts = text.Split(' ');
        return (Decimal(parts[0]), parts[1]);
    }

    private static decimal Decimal(string text) => decimal.Parse(text, NumberStyles.Number, CultureInfo.InvariantCulture);

    private static string NewKey() => $"tr-{Guid.NewGuid():N}";

    private static JsonElement Json(string body) => JsonDocument.Parse(body).RootElement.Clone();

    private static List<JsonElement> PostingsOf(JsonElement transfer) =>
        [.. transfer.GetProperty("postings").EnumerateArray()];

    private static bool Is(JsonElement element, string property, string expected) =>
        string.Equals(element.GetProperty(property).GetString(), expected, StringComparison.OrdinalIgnoreCase);

    private static IEnumerable<JsonElement> Errors(JsonElement body) =>
        body.TryGetProperty("errors", out var errors) && errors.ValueKind == JsonValueKind.Array
            ? errors.EnumerateArray()
            : [];

    private static IEnumerable<string> Messages(JsonElement body)
    {
        foreach (var name in new[] { "title", "detail" })
        {
            if (body.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String)
            {
                yield return value.GetString()!;
            }
        }

        foreach (var error in Errors(body))
        {
            if (error.TryGetProperty("message", out var message) && message.ValueKind == JsonValueKind.String)
            {
                yield return message.GetString()!;
            }
        }
    }

    [GeneratedRegex(@"^(?<amount>-?[\d.]+) (?<cur>[A-Z]+) from ""(?<src>[^""]+)"" to ""(?<dst>[^""]+)""(?: at a rate of (?<rate>[\d.]+))?(?: with a (?<fee>-?[\d.]+) [A-Z]+ fee)?(?<tail>.*)$")]
    private static partial Regex TransferPhrase();

    [GeneratedRegex(@"^(?: to| and) ""([^""]+)""$")]
    private static partial Regex FeeAccountTail();

    [GeneratedRegex(@"^ and a rate of ([\d.]+)$")]
    private static partial Regex RateTail();

    [GeneratedRegex(@"^ (?:with|under) the idempotency key ""([^""]+)""$")]
    private static partial Regex KeyTail();

    [GeneratedRegex(@"^, but (.+)$")]
    private static partial Regex ChangeTail();

    [GeneratedRegex(@"^(?<code>not found \(404\)|[A-Z_]+)(?: on the (?<field>rate|fee account|fee))?(?<nothing>, no balance changes and no transfer is recorded)?$")]
    private static partial Regex Refusal();

    [GeneratedRegex(@"""([^""]+)"" (?:still )?reads (-?[\d.]+) ([A-Z]+)")]
    private static partial Regex Reading();

    #endregion
}

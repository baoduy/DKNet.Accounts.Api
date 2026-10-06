using System.Globalization;
using DKNet.Accounts.Domains.Features.Currencies.Entities;
using DKNet.Accounts.Infra.Features.Currencies;
using Npgsql;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-1773 §5 "Ledger changes are published as events". Every scenario gets a host of its own
/// (<see cref="OutboundApiFactory"/>) on a fresh database and a queue of its own on the run's RabbitMQ broker
/// (<see cref="OutboundBroker"/>), so "no event is on the outbound queue" means exactly that. The queue is read
/// from the outside (<see cref="OutboundQueue"/>) and never created by the test: creating it is the service's job.
/// Events are matched by type and by the payload's <c>id</c>; "1 event" counts distinct message ids, because
/// delivery is at least once and a consumer drops copies by message id (§3).
/// Expected type strings and payload values are the literals of §3a.
/// </summary>
[Binding]
[Scope(Feature = "Ledger changes are published as events")]
public sealed class OutboundEventsSteps(ScenarioState state)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";
    private const string CurrenciesPath = "/v1/currencies";

    /// <summary>How long a scenario waits for an event that must arrive.</summary>
    private static readonly TimeSpan Arrival = TimeSpan.FromSeconds(30);

    /// <summary>How long a waiting event may take once the bus is back — outbox polling plus reconnection.</summary>
    private static readonly TimeSpan ArrivalAfterOutage = TimeSpan.FromSeconds(90);

    /// <summary>How long a scenario keeps reading before it asserts that an event did not arrive.</summary>
    private static readonly TimeSpan Settle = TimeSpan.FromSeconds(3);

    /// <summary>The Gherkin event names of §5 and the §3a type string each one stands for.</summary>
    private static readonly IReadOnlyDictionary<string, string> EventTypes = new Dictionary<string, string>
    {
        ["currency-created"] = "currencies.created",
        ["currency-updated"] = "currencies.updated",
        ["account-group-created"] = "account-groups.created",
        ["account-group-updated"] = "account-groups.updated",
        ["account-group-deleted"] = "account-groups.deleted",
        ["account-created"] = "accounts.created",
        ["account-updated"] = "accounts.updated",
        ["posting-created"] = "postings.created",
        ["posting-updated"] = "postings.updated"
    };

    private OutboundApiFactory? _host;
    private string? _database;
    private Dictionary<string, string?> _environment = [];
    private OutboundQueue? _queue;
    private bool _brokerStopped;

    private OutboundQueue Queue => _queue ?? throw new InvalidOperationException("No host was started.");

    private HttpClient Client => _host?.Client ?? throw new InvalidOperationException("No host was started.");

    #region Hooks

    [AfterScenario]
    public async Task AfterScenarioAsync()
    {
        if (_host is not null)
        {
            await _host.DisposeAsync();
            _host = null;
        }

        // A scenario that took the broker down hands the next scenario a running one.
        if (_brokerStopped)
        {
            await OutboundBroker.EnsureRunningAsync();
        }
    }

    #endregion

    #region Host and bus

    /// <summary>Starts a host on the scenario's database and queue, creating both names on first use.</summary>
    private async Task StartHostAsync(bool busOn, string? queueName = null, LocalSetups.BusSettings? settings = null)
    {
        await OutboundBroker.EnsureRunningAsync();

        _database ??= NewDatabase();
        _queue ??= new OutboundQueue(queueName ?? $"ledger-events-{Guid.NewGuid():N}");
        _environment = new Dictionary<string, string?>
        {
            ["FeatureManagement__EnableServiceBus"] = settings?.EnableServiceBus ?? (busOn ? "true" : "false"),
            ["MessageBus__Transport"] = settings?.Transport ?? "RabbitMq",
            ["MessageBus__OutboundQueue"] = _queue.Name,
            ["ConnectionStrings__RabbitMq"] = OutboundBroker.ConnectionString
        };
        _host = new OutboundApiFactory(_database, _environment);
    }

    /// <summary>A scenario that names no bus state runs with the bus on.</summary>
    private async Task EnsureHostAsync()
    {
        if (_host is null)
        {
            await StartHostAsync(busOn: true);
        }
    }

    private static string NewDatabase() =>
        new NpgsqlConnectionStringBuilder(ApiHooks.Factory.ContainerConnectionString)
        {
            Database = $"outbound_{Guid.NewGuid():N}"
        }.ConnectionString;

    /// <summary>
    /// Proves the service is publishing to the scenario's queue before a scenario takes the bus away: without it,
    /// "the write still succeeds while the bus is unreachable" would also pass for a service that never
    /// published at all.
    /// </summary>
    private async Task ProveTheBusIsLiveAsync()
    {
        var sentinel = await CreateGroupAsync("BUSUP");
        (await Queue.WaitUntilAsync(e => Matching(e, "account-groups.created", sentinel).Any(), Arrival))
            .ShouldBeTrue("the service must be publishing to the outbound queue before the scenario takes the bus " +
                          $"away, but no account-groups.created event arrived for {sentinel}. {Queue.Describe()}");
        state.Values["sentinel"] = sentinel.ToString();
    }

    private async Task TakeTheBusAwayAsync()
    {
        await OutboundBroker.StopAsync();
        _brokerStopped = true;
    }

    #endregion

    #region Ledger calls

    private async Task<HttpResponseMessage> SendAsync(
        HttpMethod method, string uri, object? body = null, string? idempotencyKey = null)
    {
        var response = await Client.SendAsCallerAsync(state, method, uri, body, idempotencyKey);
        state.Response = response;
        state.ResponseBody = await response.Content.ReadAsStringAsync();
        return response;
    }

    private async Task<JsonElement> SucceedsAsync(HttpResponseMessage response, string what)
    {
        var body = await response.Content.ReadAsStringAsync();
        response.IsSuccessStatusCode.ShouldBeTrue($"{what} answered {(int)response.StatusCode}: {body}");
        return body.Length == 0 ? default : JsonDocument.Parse(body).RootElement.Clone();
    }

    private static Guid IdOf(JsonElement body) => body.GetProperty("id").GetGuid();

    private Guid Record(string key) =>
        Guid.TryParse(state.Values.GetValueOrDefault(key), out var id) ? id : Guid.Empty;

    private async Task<Guid> CreateGroupAsync(string code)
    {
        var body = await SucceedsAsync(
            await SendAsync(HttpMethod.Post, GroupsPath, new { code, name = code, type = "Customer", ownerId = "PayHub" }),
            $"creating account group {code}");
        var id = IdOf(body);
        state.Values[$"group:{code}"] = id.ToString();
        return id;
    }

    private async Task<Guid> GroupAsync(string code) =>
        Record($"group:{code}") is var id && id != Guid.Empty ? id : await CreateGroupAsync(code);

    private async Task<Guid> AccountAsync(string name, string currency = "SGD")
    {
        if (Record($"account:{name}") is var existing && existing != Guid.Empty)
        {
            return existing;
        }

        var groupId = await GroupAsync("OPS");

        // Liability: a credit raises the balance, so "holds 100.00 SGD" is one credit of 100.00.
        var body = await SucceedsAsync(
            await SendAsync(HttpMethod.Post, AccountsPath, new
            {
                groupId,
                name,
                currency,
                classification = "Liability",
                permittedToGoNegative = false
            }),
            $"opening account {name}");
        var id = IdOf(body);
        state.Values[$"account:{name}"] = id.ToString();
        return id;
    }

    private async Task<HttpResponseMessage> RecordPostingAsync(
        string direction, decimal amount, string currency, string accountName, string? idempotencyKey = null)
    {
        var accountId = await AccountAsync(accountName, currency);
        var response = await SendAsync(HttpMethod.Post, PostingsPath,
            new { accountId, direction, amount, currency, category = "Transfer" }, idempotencyKey);
        if (response.IsSuccessStatusCode)
        {
            state.Values["posting:last"] = IdOf(await SucceedsAsync(response, "recording a posting")).ToString();
        }

        return response;
    }

    /// <summary>Removes a seeded currency straight from the database — no save, so nothing is published — so the
    /// scenario can register it. Every fresh database is seeded with SGD, MYR and THB by its migrations.</summary>
    private async Task RemoveSeededCurrencyAsync(string code)
    {
        using var scope = _host!.CreateScope();
        await scope.ServiceProvider.GetRequiredService<CoreDbContext>()
            .Set<Currency>().Where(c => c.Code == code).ExecuteDeleteAsync();
    }

    private static Guid SeededCurrencyId(string code) => SeededCurrencies.All.Single(c => c.Code == code).Id;

    /// <summary>Every row in every outbox table of the given database.</summary>
    private static async Task<long> StoredEventsAsync(string database)
    {
        await using var connection = new NpgsqlConnection(database);
        await connection.OpenAsync();

        var tables = new List<string>();
        await using (var find = new NpgsqlCommand(
                         "SELECT format('%I.%I', table_schema, table_name) FROM information_schema.tables " +
                         "WHERE table_type = 'BASE TABLE' AND table_name ILIKE '%outbox%'", connection))
        await using (var reader = await find.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                tables.Add(reader.GetString(0));
            }
        }

        long rows = 0;
        foreach (var table in tables)
        {
            await using var count = new NpgsqlCommand($"SELECT COUNT(*) FROM {table}", connection);
            rows += (long)(await count.ExecuteScalarAsync())!;
        }

        return rows;
    }

    #endregion

    #region Queue assertions

    private static IEnumerable<OutboundEvent> Matching(IEnumerable<OutboundEvent> events, string type, Guid id) =>
        events.Where(e => e.Type == type && e.PayloadId == id);

    /// <summary>Waits for an event of <paramref name="type"/> for record <paramref name="id"/>, then asserts
    /// exactly <paramref name="count"/> distinct events of it arrived, each carrying a message id (§3a).</summary>
    private async Task<IReadOnlyList<OutboundEvent>> ExpectEventsAsync(
        string type, Guid id, int count = 1, TimeSpan? timeout = null)
    {
        await Queue.WaitUntilAsync(e => Distinct(Matching(e, type, id)).Count >= count, timeout ?? Arrival);
        await Queue.SettleAsync(TimeSpan.FromSeconds(1));

        var copies = Matching(Queue.Received, type, id).ToList();
        copies.ShouldAllBe(e => !string.IsNullOrEmpty(e.MessageId) && e.MessageId!.Length <= 128,
            $"every {type} event must carry a message id of at most 128 characters. {Queue.Describe()}");
        var events = Distinct(copies);
        events.Count.ShouldBe(count, $"expected {count} {type} event(s) for {id}. {Queue.Describe()}");
        return events;
    }

    /// <summary>One event per message id: copies of a redelivered event are the same event.</summary>
    private static List<OutboundEvent> Distinct(IEnumerable<OutboundEvent> copies) =>
        copies.GroupBy(e => e.MessageId).Select(g => g.First()).ToList();

    private static string Text(JsonElement payload, string field) =>
        payload.TryGetProperty(field, out var value) ? value.ToString() : $"<no {field}>";

    #endregion

    #region Given

    [Given(@"^the message bus is on$")]
    public Task GivenTheMessageBusIsOn() => StartHostAsync(busOn: true);

    [Given(@"^the message bus is off$")]
    public async Task GivenTheMessageBusIsOff()
    {
        // The queue must be one the service does publish to, or "nothing is sent" proves nothing: a host with the
        // bus on shows the queue is live first, then the host under test starts on the same queue and broker, with
        // every bus setting in place except the switch (R3), on a database of its own.
        await StartHostAsync(busOn: true);
        await ProveTheBusIsLiveAsync();
        await _host!.DisposeAsync();

        _database = NewDatabase();
        await StartHostAsync(busOn: false);
    }

    [Given(@"^the message bus is unreachable$")]
    public async Task GivenTheMessageBusIsUnreachable()
    {
        await EnsureHostAsync();
        await ProveTheBusIsLiveAsync();
        await TakeTheBusAwayAsync();
    }

    [Given(@"^a currency-created event for ""([A-Z]+)"" is waiting because the bus was unreachable$")]
    public async Task GivenACurrencyCreatedEventIsWaiting(string code)
    {
        await GivenTheMessageBusIsUnreachable();
        await WhenTreasuryOpsRegistersCurrency(code, 2);
        await SucceedsAsync(state.Response!, $"registering {code} while the bus is unreachable");

        (await StoredEventsAsync(_database!)).ShouldBeGreaterThan(0,
            $"the currency-created event for {code} must be stored while the bus is unreachable.");
    }

    [Given(@"^the service has restarted$")]
    public async Task GivenTheServiceHasRestarted()
    {
        await _host!.DisposeAsync();
        _host = new OutboundApiFactory(_database!, _environment);
    }

    [Given(@"^account ""([^""]+)"" holds ([\d.]+) (\w+)$")]
    public async Task GivenAccountHolds(string name, decimal amount, string currency)
    {
        await EnsureHostAsync();
        await SucceedsAsync(await RecordPostingAsync("Credit", amount, currency, name), $"crediting {name}");
    }

    [Given(@"^treasury-ops recorded a credit of ([\d.]+) (\w+) on ""([^""]+)""$")]
    public async Task GivenTreasuryOpsRecordedACredit(decimal amount, string currency, string name)
    {
        await EnsureHostAsync();
        await SucceedsAsync(await RecordPostingAsync("Credit", amount, currency, name), $"crediting {name}");
        state.Values["posting:original"] = state.Values["posting:last"];
    }

    [Given(@"^account ""([^""]+)"" is closed$")]
    public async Task GivenAccountIsClosed(string name)
    {
        await EnsureHostAsync();
        var id = await AccountAsync(name);
        await SucceedsAsync(await SendAsync(HttpMethod.Patch, $"{AccountsPath}/{id}", new { status = "Closed" }),
            $"closing {name}");
    }

    [Given(@"^account group ""([^""]+)"" is empty and active$")]
    public async Task GivenAccountGroupIsEmptyAndActive(string code)
    {
        await EnsureHostAsync();
        await CreateGroupAsync(code);
    }

    [Given(@"^the docker compose setup is started on an (arm64|amd64) machine$")]
    public async Task GivenTheLocalSetupIsStarted(string machine)
    {
        // The setup's own wiring is read from its files, including that its RabbitMQ is the official image, which
        // is published for both linux/arm64 and linux/amd64. A host is then started with the settings that setup
        // gives the API, against the run's broker, on the build host's own architecture (§7 slice note 1).
        var settings = LocalSetups.DockerCompose();
        state.Values["machine"] = machine;

        settings.EnableServiceBus.ShouldNotBeNull("the docker compose setup must switch the message bus on.");
        bool.Parse(settings.EnableServiceBus).ShouldBeTrue("the docker compose setup must switch the message bus on.");
        settings.Transport.ShouldBe("RabbitMq", "the docker compose setup must run the API on RabbitMQ.");
        settings.OutboundQueue.ShouldNotBeNullOrWhiteSpace("the docker compose setup must name the outbound queue.");

        await StartHostAsync(busOn: true, settings.OutboundQueue, settings);
    }

    #endregion

    #region When

    [When(@"^treasury-ops registers currency ""([A-Z]+)"" with (\d+) decimal places$")]
    public async Task WhenTreasuryOpsRegistersCurrency(string code, int decimalPlaces)
    {
        await EnsureHostAsync();
        await RemoveSeededCurrencyAsync(code);
        var response = await SendAsync(HttpMethod.Post, CurrenciesPath,
            new { code, name = $"{code} registered by treasury-ops", decimalPlaces });
        state.Values["registered:code"] = code;
        state.Values["registered:places"] = decimalPlaces.ToString(CultureInfo.InvariantCulture);
        if (response.IsSuccessStatusCode)
        {
            var id = IdOf(await SucceedsAsync(response, $"registering {code}"));
            state.Values["record"] = id.ToString();
            state.Values[$"currency:{code}"] = id.ToString();
        }
    }

    [When(@"^treasury-ops deactivates currency ""([A-Z]+)""$")]
    public async Task WhenTreasuryOpsDeactivatesCurrency(string code)
    {
        var id = SeededCurrencyId(code);
        await SucceedsAsync(await SendAsync(HttpMethod.Post, $"{CurrenciesPath}/{id}/deactivate"), $"deactivating {code}");
        state.Values["record"] = id.ToString();
    }

    [When(@"^treasury-ops creates account group ""([^""]+)""$")]
    public async Task WhenTreasuryOpsCreatesAccountGroup(string code) =>
        state.Values["record"] = (await CreateGroupAsync(code)).ToString();

    [When(@"^treasury-ops closes account group ""([^""]+)""$")]
    public async Task WhenTreasuryOpsClosesAccountGroup(string code)
    {
        var id = await GroupAsync(code);
        await SucceedsAsync(await SendAsync(HttpMethod.Post, $"{GroupsPath}/{id}/close"), $"closing {code}");
        state.Values["record"] = id.ToString();
    }

    [When(@"^treasury-ops deletes the empty account group ""([^""]+)""$")]
    [When(@"^treasury-ops deletes account group ""([^""]+)""$")]
    public async Task WhenTreasuryOpsDeletesAccountGroup(string code)
    {
        var id = await GroupAsync(code);
        await SucceedsAsync(await SendAsync(HttpMethod.Delete, $"{GroupsPath}/{id}"), $"deleting {code}");
        state.Values["record"] = id.ToString();
    }

    [When(@"^treasury-ops opens account ""([^""]+)"" in (\w+)$")]
    public async Task WhenTreasuryOpsOpensAccount(string name, string currency) =>
        state.Values["record"] = (await AccountAsync(name, currency)).ToString();

    [When(@"^treasury-ops renames account ""([^""]+)"" to ""([^""]+)""$")]
    public async Task WhenTreasuryOpsRenamesAccount(string name, string newName)
    {
        var id = await AccountAsync(name);
        await SucceedsAsync(await SendAsync(HttpMethod.Put, $"{AccountsPath}/{id}", new { name = newName }),
            $"renaming {name}");
        state.Values["record"] = id.ToString();
    }

    [When(@"^treasury-ops sets the overdraft limit of ""([^""]+)"" to ([\d.]+) (\w+)$")]
    public async Task WhenTreasuryOpsSetsTheOverdraftLimit(string name, decimal limit, string currency)
    {
        var id = await AccountAsync(name, currency);
        await SucceedsAsync(await SendAsync(HttpMethod.Patch, $"{AccountsPath}/{id}",
            new { permittedToGoNegative = true, overdraftLimit = limit }), $"setting the overdraft limit of {name}");
        state.Values["record"] = id.ToString();
    }

    [When(@"^treasury-ops records a (credit|debit) of ([\d.]+) (\w+) on ""([^""]+)""$")]
    public Task WhenTreasuryOpsRecordsAPosting(string direction, decimal amount, string currency, string name) =>
        WhenTreasuryOpsRecordsAPostingWithIdempotencyKey(direction, amount, currency, name, null);

    [When(@"^treasury-ops records a (credit|debit) of ([\d.]+) (\w+) on ""([^""]+)"" with idempotency key ""([^""]+)""$")]
    public async Task WhenTreasuryOpsRecordsAPostingWithIdempotencyKey(
        string direction, decimal amount, string currency, string name, string? idempotencyKey)
    {
        await EnsureHostAsync();
        var response = await RecordPostingAsync(
            direction == "credit" ? "Credit" : "Debit", amount, currency, name, idempotencyKey);
        if (response.IsSuccessStatusCode)
        {
            state.Values["record"] = state.Values["posting:last"];
        }
    }

    [When(@"^treasury-ops reverses that credit with reason ""([^""]+)""$")]
    public async Task WhenTreasuryOpsReversesThatCredit(string reason)
    {
        var body = await SucceedsAsync(
            await SendAsync(HttpMethod.Post, $"{PostingsPath}/{Record("posting:original")}/reverse",
                new { reason }, $"rev-{Guid.NewGuid():N}"),
            "reversing the credit");
        state.Values["posting:reversal"] = IdOf(body).ToString();
    }

    [When(@"^treasury-ops records a batch of (\d+) postings on ""([^""]+)""$")]
    public async Task WhenTreasuryOpsRecordsABatch(int count, string name)
    {
        await EnsureHostAsync();
        var accountId = await AccountAsync(name);
        var movements = Enumerable.Range(1, count)
            .Select(i => new { accountId, direction = "Credit", amount = 10.00m * i, currency = "SGD", category = "Transfer" })
            .ToArray();
        var body = await SucceedsAsync(
            await SendAsync(HttpMethod.Post, $"{PostingsPath}/batch", new { movements }, $"batch-{Guid.NewGuid():N}"),
            "recording the batch");
        state.Values["batch"] = string.Join(',', body.EnumerateArray().Select(p => IdOf(p)));
    }

    [When(@"^the message bus becomes reachable again$")]
    public async Task WhenTheMessageBusBecomesReachableAgain()
    {
        await OutboundBroker.EnsureRunningAsync();
        _brokerStopped = false;
    }

    #endregion

    #region Then

    [Then(@"^1 ([a-z-]+) event for that record is on the outbound queue$")]
    public async Task ThenOneEventForThatRecordIsOnTheOutboundQueue(string eventName) =>
        await ExpectEventsAsync(EventTypes[eventName], Record("record"));

    [Then(@"^1 posting-created event is on the outbound queue$")]
    public async Task ThenOnePostingCreatedEventIsOnTheOutboundQueue() =>
        await ExpectEventsAsync("postings.created", Record("posting:last"));

    [Then(@"^no account-updated event is on the outbound queue$")]
    public async Task ThenNoAccountUpdatedEventIsOnTheOutboundQueue()
    {
        await Queue.SettleAsync(Settle);
        Queue.Received.Where(e => e.Type == "accounts.updated").ShouldBeEmpty(Queue.Describe());
    }

    [Then(@"^1 posting-created event for the reversing debit is on the outbound queue$")]
    public async Task ThenOnePostingCreatedEventForTheReversingDebit()
    {
        var payload = (await ExpectEventsAsync("postings.created", Record("posting:reversal"))).Single().Payload;
        Text(payload, "direction").ShouldBe("debit", payload.ToString());
        Text(payload, "reversesPostingId").ShouldBe(Record("posting:original").ToString(), payload.ToString());
    }

    [Then(@"^1 posting-updated event shows the original credit as reversed$")]
    public async Task ThenOnePostingUpdatedEventShowsTheOriginalCreditAsReversed()
    {
        var payload = (await ExpectEventsAsync("postings.updated", Record("posting:original"))).Single().Payload;
        Text(payload, "direction").ShouldBe("credit", payload.ToString());
        Text(payload, "status").ShouldBe("reversed", payload.ToString());
        Text(payload, "reversedByPostingId").ShouldBe(Record("posting:reversal").ToString(), payload.ToString());
    }

    [Then(@"^(\d+) posting-created events are on the outbound queue$")]
    public async Task ThenPostingCreatedEventsAreOnTheOutboundQueue(int count)
    {
        var postings = state.Values["batch"].Split(',').Select(Guid.Parse).ToArray();
        postings.Length.ShouldBe(count, "the batch must record one posting per movement.");
        foreach (var posting in postings)
        {
            await ExpectEventsAsync("postings.created", posting);
        }
    }

    [Then(@"^the posting is refused with ""([^""]+)""$")]
    public void ThenThePostingIsRefusedWith(string code)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity, state.ResponseBody);
        JsonDocument.Parse(state.ResponseBody!).RootElement.GetProperty("errors").EnumerateArray()
            .Select(e => e.TryGetProperty("code", out var c) ? c.GetString() : null)
            .ShouldContain(code, state.ResponseBody);
    }

    [Then(@"^no event is on the outbound queue$")]
    public async Task ThenNoEventIsOnTheOutboundQueue()
    {
        // The account's own setup events show the queue is live; the refused debit must add none after them.
        var accountId = Record("account:Ops float");
        (await Queue.WaitUntilAsync(e => Matching(e, "accounts.updated", accountId).Any(), Arrival))
            .ShouldBeTrue($"the account's closing must reach the queue before its absence of events means anything. {Queue.Describe()}");
        await Queue.SettleAsync(Settle);

        var setup = new[]
        {
            ("account-groups.created", Record("group:OPS")),
            ("accounts.created", accountId),
            ("accounts.updated", accountId)
        };
        Queue.Received.Where(e => !setup.Contains((e.Type!, e.PayloadId ?? Guid.Empty))).ShouldBeEmpty(Queue.Describe());
    }

    [Then(@"^the registration succeeds$")]
    public async Task ThenTheRegistrationSucceeds()
    {
        var body = await SucceedsAsync(state.Response!, "the registration");
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created, state.ResponseBody);
        body.GetProperty("code").GetString().ShouldBe(state.Values["registered:code"]);
    }

    [Then(@"^the registration succeeds as it does today$")]
    public async Task ThenTheRegistrationSucceedsAsItDoesToday()
    {
        await ThenTheRegistrationSucceeds();
        var body = JsonDocument.Parse(state.ResponseBody!).RootElement;
        body.GetProperty("decimalPlaces").GetInt32().ShouldBe(int.Parse(state.Values["registered:places"], CultureInfo.InvariantCulture));
        body.GetProperty("isActive").GetBoolean().ShouldBeTrue();
    }

    [Then(@"^no event is stored or sent$")]
    public async Task ThenNoEventIsStoredOrSent()
    {
        await Queue.SettleAsync(Settle);
        var sentinel = Record("sentinel");
        Queue.Received.Where(e => !(e.Type == "account-groups.created" && e.PayloadId == sentinel))
            .ShouldBeEmpty(Queue.Describe());
        (await StoredEventsAsync(_database!)).ShouldBe(0, "with the bus off, no event may be stored.");
    }

    [Then(@"^1 currency-created event for ""([A-Z]+)"" is on the outbound queue$")]
    public async Task ThenOneCurrencyCreatedEventForIsOnTheOutboundQueue(string code)
    {
        var payload = (await ExpectEventsAsync("currencies.created", Record($"currency:{code}"), timeout: ArrivalAfterOutage))
            .Single().Payload;
        Text(payload, "code").ShouldBe(code, payload.ToString());
    }

    [Then(@"^1 currency-created event for ""([A-Z]+)"" is on the local RabbitMQ outbound queue$")]
    public async Task ThenOneCurrencyCreatedEventForIsOnTheLocalRabbitMqOutboundQueue(string code)
    {
        var payload = (await ExpectEventsAsync("currencies.created", Record($"currency:{code}"))).Single().Payload;
        Text(payload, "code").ShouldBe(code, payload.ToString());
    }

    [Then(@"^the posting-created event carries amount ([\d.]+), currency ""([^""]+)"" and idempotency key ""([^""]+)""$")]
    public async Task ThenThePostingCreatedEventCarries(decimal amount, string currency, string idempotencyKey)
    {
        var payload = (await ExpectEventsAsync("postings.created", Record("posting:last"))).Single().Payload;
        payload.GetProperty("amount").GetDecimal().ShouldBe(amount, payload.ToString());
        Text(payload, "currency").ShouldBe(currency, payload.ToString());
        Text(payload, "idempotencyKey").ShouldBe(idempotencyKey, payload.ToString());
    }

    [Then(@"^the event does not carry the posting's idempotency signature$")]
    public void ThenTheEventDoesNotCarryThePostingsIdempotencySignature()
    {
        var payload = Distinct(Matching(Queue.Received, "postings.created", Record("posting:last"))).Single().Payload;
        payload.EnumerateObject()
            .Where(p => p.Name.Contains("signature", StringComparison.OrdinalIgnoreCase))
            .Select(p => p.Name)
            .ShouldBeEmpty(payload.ToString());
    }

    [Then(@"^the account-group-deleted event carries code ""([^""]+)"" and status (\w+)$")]
    public async Task ThenTheAccountGroupDeletedEventCarries(string code, string status)
    {
        var payload = (await ExpectEventsAsync("account-groups.deleted", Record("record"))).Single().Payload;
        Text(payload, "code").ShouldBe(code, payload.ToString());
        Text(payload, "status").ShouldBe(status, payload.ToString());
    }

    #endregion
}

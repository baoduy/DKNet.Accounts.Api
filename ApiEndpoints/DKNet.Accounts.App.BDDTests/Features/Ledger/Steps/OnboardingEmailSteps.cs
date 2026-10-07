using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-2156 §5 "Onboarding email when an account opens in the local demo". Every scenario gets a
/// host of its own (<see cref="OutboundApiFactory"/>) on a fresh database, an outbound exchange of its own on the
/// run's RabbitMQ broker (<see cref="OutboundBroker"/>) and, with the feature on, the onboarding queue
/// <c>&lt;exchange&gt;.onboarding-email</c>. DKNet Notification is <see cref="FakeNotificationService"/>; a request
/// is matched to its account by the <c>Idempotency-Key</c> of §5, <c>onboarding-email-&lt;accountNumber&gt;</c>.
/// Expected strings are the literals of §5 and §6.
/// </summary>
[Binding]
[Scope(Feature = "Onboarding email when an account opens in the local demo")]
public sealed class OnboardingEmailSteps(ScenarioState state)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";

    /// <summary>How long a scenario waits for a request or an event that must arrive.</summary>
    private static readonly TimeSpan Arrival = TimeSpan.FromSeconds(30);

    /// <summary>How long a scenario keeps watching before it asserts that something did not happen.</summary>
    private static readonly TimeSpan Settle = TimeSpan.FromSeconds(3);

    /// <summary>The group names of §5 and the 3-5 character code each one is created with.</summary>
    private static readonly IReadOnlyDictionary<string, string> GroupCodes = new Dictionary<string, string>
    {
        ["Acme Retail"] = "ACME",
        ["Kopi Traders"] = "KOPI",
        ["Ops Float"] = "OPSF",
        ["Suspense Pool"] = "SUSP",
        ["Daily Settlement"] = "DSET",
        ["Sentinel Retail"] = "SENT"
    };

    private readonly FakeNotificationService _notification = new();
    private OutboundApiFactory? _host;
    private OutboundQueue? _ledgerReader;
    private string _exchange = "";
    private string? _accountNumber;

    private HttpClient Client => _host?.Client ?? throw new InvalidOperationException("No host was started.");

    private string AccountNumber => _accountNumber ?? throw new InvalidOperationException("No account was opened.");

    private string OnboardingQueue => $"{_exchange}.onboarding-email";

    [AfterScenario]
    public async Task AfterScenarioAsync()
    {
        if (_host is not null)
        {
            await _host.DisposeAsync();
            _host = null;
        }
    }

    #region Host

    /// <summary>Starts a host with the bus on over RabbitMQ, the email feature on or left at its default.</summary>
    private async Task StartHostAsync(bool onboardingEmail)
    {
        await OutboundBroker.EnsureRunningAsync();

        _exchange = $"ledger-events-{Guid.NewGuid():N}";
        _ledgerReader = new OutboundQueue(_exchange);

        var environment = new Dictionary<string, string?>
        {
            ["FeatureManagement__EnableServiceBus"] = "true",
            ["MessageBus__Transport"] = "RabbitMq",
            ["MessageBus__OutboundQueue"] = _exchange,
            ["ConnectionStrings__RabbitMq"] = OutboundBroker.ConnectionString
        };
        if (onboardingEmail)
        {
            environment["FeatureManagement__EnableOnboardingEmail"] = "true";
            foreach (var (key, value) in FakeNotificationService.Settings(OnboardingQueue))
            {
                environment[key] = value;
            }
        }

        var database = new Npgsql.NpgsqlConnectionStringBuilder(ApiHooks.Factory.ContainerConnectionString)
        {
            Database = $"onboarding_{Guid.NewGuid():N}"
        }.ConnectionString;
        _host = new OutboundApiFactory(database, environment, _notification.Register);
    }

    private async Task EnsureHostAsync()
    {
        if (_host is null)
        {
            await StartHostAsync(onboardingEmail: true);
        }
    }

    #endregion

    #region Ledger calls

    private async Task<JsonElement> SucceedsAsync(HttpMethod method, string uri, object body, string what)
    {
        var response = await Client.SendAsCallerAsync(state, method, uri, body);
        state.Response = response;
        state.ResponseBody = await response.Content.ReadAsStringAsync();
        response.IsSuccessStatusCode.ShouldBeTrue($"{what} answered {(int)response.StatusCode}: {state.ResponseBody}");
        return JsonDocument.Parse(state.ResponseBody).RootElement.Clone();
    }

    private async Task<Guid> CreateGroupAsync(string name, string type)
    {
        await EnsureHostAsync();
        var code = GroupCodes[name];
        var body = await SucceedsAsync(HttpMethod.Post, GroupsPath,
            new { code, name, type, ownerId = "PayHub" }, $"creating {type} group {name}");
        var id = body.GetProperty("id").GetGuid();
        state.Values[$"group:{name}"] = id.ToString();
        return id;
    }

    private async Task<Guid> GroupAsync(string name, string type) =>
        Guid.TryParse(state.Values.GetValueOrDefault($"group:{name}"), out var id)
            ? id
            : await CreateGroupAsync(name, type);

    /// <summary>Opens an account in the group and returns its account number.</summary>
    private async Task<string> OpenAccountAsync(string currency, string groupName, string groupType = "Customer")
    {
        var groupId = await GroupAsync(groupName, groupType);
        var body = await SucceedsAsync(HttpMethod.Post, AccountsPath, new
        {
            groupId,
            name = $"Wallet {currency}",
            currency,
            classification = "Liability",
            permittedToGoNegative = false
        }, $"opening a {currency} account in {groupName}");
        return body.GetProperty("accountNumber").GetString()!;
    }

    #endregion

    #region Notification requests

    private static string KeyOf(string accountNumber) => $"onboarding-email-{accountNumber}";

    private IReadOnlyList<NotificationRequest> RequestsFor(string accountNumber) =>
        _notification.Requests.Where(r => r.IdempotencyKey == KeyOf(accountNumber)).ToArray();

    private string DescribeRequests() =>
        _notification.Requests.Count == 0
            ? "no notification request was sent"
            : string.Join(Environment.NewLine, _notification.Requests);

    private async Task<IReadOnlyList<NotificationRequest>> ExpectRequestsAsync(string accountNumber, int count)
    {
        (await Eventually.IsTrueAsync(() => RequestsFor(accountNumber).Count >= count, Arrival))
            .ShouldBeTrue($"expected {count} onboarding request(s) for {accountNumber}. {DescribeRequests()}");
        await Task.Delay(Settle);
        var requests = RequestsFor(accountNumber);
        requests.Count.ShouldBe(count, DescribeRequests());
        return requests;
    }

    /// <summary>
    /// Proves the email feature is reading its queue before a scenario asserts that it requested nothing: the
    /// consumer takes one message at a time, so once a Customer account opened AFTER the one under test has its
    /// request, the one under test has been read too.
    /// </summary>
    private async Task ProveTheEmailFeatureIsLiveAsync()
    {
        var sentinel = await OpenAccountAsync("SGD", "Sentinel Retail");
        await ExpectRequestsAsync(sentinel, 1);
    }

    #endregion

    #region Given

    [Given(@"^""([^""]+)"" is a (Customer|Merchant|Internal|Suspense|Settlement) group$")]
    public Task GivenIsAGroup(string name, string type) => CreateGroupAsync(name, type);

    [Given(@"^the notification service (cannot be reached|refuses the request as not permitted)$")]
    public async Task GivenTheNotificationService(string failure)
    {
        await EnsureHostAsync();
        _notification.Mode = failure == "cannot be reached"
            ? FakeNotificationService.Failure.Unreachable
            : FakeNotificationService.Failure.Forbidden;
    }

    [Given(@"^treasury-ops opened a EUR account in the ""([^""]+)"" customer group$")]
    public async Task GivenTreasuryOpsOpenedAnAccount(string groupName)
    {
        _accountNumber = await OpenAccountAsync("EUR", groupName);
        await ExpectRequestsAsync(AccountNumber, 1);
    }

    [Given(@"^another system reads the ledger events$")]
    public Task GivenAnotherSystemReadsTheLedgerEvents() => EnsureHostAsync();

    [Given(@"^the Accounts service runs with its default settings$")]
    public Task GivenTheAccountsServiceRunsWithItsDefaultSettings() => StartHostAsync(onboardingEmail: false);

    #endregion

    #region When

    [When(@"^treasury-ops opens a (SGD|EUR) account in ""([^""]+)""$")]
    public async Task WhenTreasuryOpsOpensAnAccountIn(string currency, string groupName) =>
        _accountNumber = await OpenAccountAsync(currency, groupName);

    [When(@"^treasury-ops opens a EUR account in the ""([^""]+)"" customer group$")]
    public async Task WhenTreasuryOpsOpensAnAccountInTheCustomerGroup(string groupName) =>
        _accountNumber = await OpenAccountAsync("EUR", groupName);

    /// <summary>
    /// The first delivery happened when the account opened. The second is the same message, read off the ledger
    /// queue the way any reader sees it, published again onto the onboarding queue — what a broker redelivery
    /// looks like to the consumer.
    /// </summary>
    [When(@"^its account-opened event reaches the email feature twice$")]
    public async Task WhenItsAccountOpenedEventReachesTheEmailFeatureTwice()
    {
        var created = await AccountCreatedEventAsync();

        var connection = await new ConnectionFactory { Uri = new Uri(OutboundBroker.ConnectionString) }
            .CreateConnectionAsync();
        await using (connection)
        {
            await using var channel = await connection.CreateChannelAsync();
            await channel.BasicPublishAsync(string.Empty, OnboardingQueue, Encoding.UTF8.GetBytes(created.Body));
        }
    }

    #endregion

    #region Then

    [Then(@"^one onboarding email is requested for the new account's number$")]
    public async Task ThenOneOnboardingEmailIsRequested()
    {
        var request = (await ExpectRequestsAsync(AccountNumber, 1)).Single();

        using var body = JsonDocument.Parse(request.Body);
        body.RootElement.GetProperty("channel").GetString().ShouldBe("email");
        body.RootElement.GetProperty("templateId").GetString().ShouldBe("account-opened");
        request.Parameter("accountNumber").ShouldBe(AccountNumber);
        request.Parameter("customerName").ShouldNotBeNullOrWhiteSpace();
        request.Parameter("to")!.ShouldMatch(@"^[a-z]+\.[a-z]+\.[0-9a-f]{8}@example\.com$");
        request.Authorization.ShouldBe($"Bearer {FakeNotificationService.AccessToken}");
    }

    [Then(@"^no onboarding email is requested$")]
    public async Task ThenNoOnboardingEmailIsRequested()
    {
        if (await _ledgerReader!.ExistsAsync() && await new OutboundQueue(OnboardingQueue).ExistsAsync())
        {
            await ProveTheEmailFeatureIsLiveAsync();
        }
        else
        {
            // Feature off: the event was published, and nothing reads a copy of it for an email.
            await AccountCreatedEventAsync();
            await Task.Delay(Settle);
            (await new OutboundQueue(OnboardingQueue).ExistsAsync())
                .ShouldBeFalse($"with the feature off, queue {OnboardingQueue} must not be declared.");
        }

        RequestsFor(AccountNumber).ShouldBeEmpty(DescribeRequests());
    }

    [Then(@"^the account is open$")]
    public void ThenTheAccountIsOpen() =>
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.Created, state.ResponseBody);

    [Then(@"^one error is logged with the new account's number and the reason$")]
    public async Task ThenOneErrorIsLogged()
    {
        var expected = _notification.Mode == FakeNotificationService.Failure.Unreachable
            ? $"Onboarding email request for account {AccountNumber} failed: HttpRequestException: " +
              "Connection refused (notification.test:80)"
            : $"Onboarding email request for account {AccountNumber} failed: status 403.";

        (await Eventually.IsTrueAsync(() => Errors().Any(), Arrival))
            .ShouldBeTrue($"expected an error log entry for {AccountNumber}. {DescribeRequests()}");
        await Task.Delay(Settle);
        Errors().ShouldHaveSingleItem().Message.ShouldBe(expected);

        // R7: nothing logged carries the token, the client secret or the Authorization header.
        _host!.LogCapture.Messages.ShouldNotContain(m =>
            m.Contains(FakeNotificationService.AccessToken, StringComparison.Ordinal)
            || m.Contains(FakeNotificationService.ClientSecret, StringComparison.Ordinal)
            || m.Contains("Authorization", StringComparison.OrdinalIgnoreCase));
    }

    [Then(@"^no second request is sent for that account$")]
    public async Task ThenNoSecondRequestIsSent() => await ExpectRequestsAsync(AccountNumber, 1);

    /// <summary>
    /// D9: both deliveries build the same request under the same key, so DKNet Notification replays the first
    /// notification instead of sending a second email.
    /// </summary>
    [Then(@"^only one onboarding email is sent for that account$")]
    public async Task ThenOnlyOneOnboardingEmailIsSent()
    {
        var requests = await ExpectRequestsAsync(AccountNumber, 2);
        requests.Select(r => (r.IdempotencyKey, r.Body)).Distinct().ShouldHaveSingleItem();
    }

    [Then(@"^that system still receives the account-opened event$")]
    public async Task ThenThatSystemStillReceivesTheAccountOpenedEvent()
    {
        var created = await AccountCreatedEventAsync();
        created.Payload.GetProperty("accountNumber").GetString().ShouldBe(AccountNumber);

        // ...and the email feature read its own copy of that same event.
        await ExpectRequestsAsync(AccountNumber, 1);
    }

    #endregion

    private IEnumerable<TestLogCapture.Entry> Errors() =>
        _host!.LogCapture.Entries.Where(e => e.Level >= LogLevel.Error && e.Message.Contains(AccountNumber,
            StringComparison.Ordinal));

    /// <summary>The account-opened event for the scenario's account, as the ledger queue's reader receives it.</summary>
    private async Task<OutboundEvent> AccountCreatedEventAsync()
    {
        bool IsOurs(OutboundEvent e) =>
            e.Type == "accounts.created"
            && e.Payload.ValueKind == JsonValueKind.Object
            && e.Payload.GetProperty("accountNumber").GetString() == AccountNumber;

        (await _ledgerReader!.WaitUntilAsync(events => events.Any(IsOurs), Arrival))
            .ShouldBeTrue($"no accounts.created event for {AccountNumber}. {_ledgerReader.Describe()}");
        return _ledgerReader.Received.Single(IsOurs);
    }
}

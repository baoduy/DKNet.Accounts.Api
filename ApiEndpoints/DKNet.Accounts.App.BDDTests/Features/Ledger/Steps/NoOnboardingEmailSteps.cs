namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-2166 §5 "The Accounts API never asks for an onboarding email, even with its former
/// settings". The host (<see cref="OutboundApiFactory"/>) gets a fresh database, an outbound exchange of its own on
/// the run's RabbitMQ broker (<see cref="OutboundBroker"/>) and every setting that turned the onboarding email on in
/// v0.2.14, written out as literals. DKNet Notification is <see cref="FakeNotificationService"/>, which records any
/// request the host sends.
/// </summary>
[Binding]
[Scope(Feature = "Onboarding email from the email processor in the local demo")]
public sealed class NoOnboardingEmailSteps(ScenarioState state)
{
    private const string GroupsPath = "/v1/account-groups";
    private const string AccountsPath = "/v1/accounts";

    /// <summary>How long the scenario waits for the account-opened event to reach the ledger's reader.</summary>
    private static readonly TimeSpan Arrival = TimeSpan.FromSeconds(30);

    /// <summary>
    /// How long the scenario watches for a notification request after the event was published. v0.2.14's consumer
    /// sent its request within a second of the event; any request in this window fails the scenario at once.
    /// </summary>
    private static readonly TimeSpan Watch = TimeSpan.FromSeconds(10);

    private readonly FakeNotificationService _notification = new();
    private OutboundApiFactory? _host;
    private OutboundQueue? _ledgerReader;
    private string? _accountNumber;

    private HttpClient Client => _host?.Client ?? throw new InvalidOperationException("No host was started.");

    [AfterScenario]
    public async Task AfterScenarioAsync()
    {
        if (_host is not null)
        {
            await _host.DisposeAsync();
            _host = null;
        }
    }

    [Given(@"^the Accounts API runs with the settings that turned its onboarding email on before this change$")]
    public async Task GivenTheAccountsApiRunsWithItsFormerOnboardingEmailSettings()
    {
        await OutboundBroker.EnsureRunningAsync();

        var exchange = $"ledger-events-{Guid.NewGuid():N}";
        _ledgerReader = new OutboundQueue(exchange);

        // The full v0.2.14 set: the bus on over RabbitMQ, the feature flag on, and every OnboardingEmail key.
        var environment = new Dictionary<string, string?>
        {
            ["FeatureManagement__EnableServiceBus"] = "true",
            ["MessageBus__Transport"] = "RabbitMq",
            ["MessageBus__OutboundQueue"] = exchange,
            ["ConnectionStrings__RabbitMq"] = OutboundBroker.ConnectionString,
            ["FeatureManagement__EnableOnboardingEmail"] = "true",
            ["OnboardingEmail__NotificationBaseUrl"] = FakeNotificationService.BaseUrl,
            ["OnboardingEmail__TokenUrl"] = FakeNotificationService.TokenUrl,
            ["OnboardingEmail__ClientId"] = "accounts-onboarding-email",
            ["OnboardingEmail__ClientSecret"] = FakeNotificationService.ClientSecret,
            ["OnboardingEmail__Queue"] = $"{exchange}.onboarding-email"
        };

        var database = new Npgsql.NpgsqlConnectionStringBuilder(ApiHooks.Factory.ContainerConnectionString)
        {
            Database = $"no_onboarding_{Guid.NewGuid():N}"
        }.ConnectionString;
        _host = new OutboundApiFactory(database, environment, _notification.Register);
    }

    [When(@"^treasury-ops opens a EUR account in the ""([^""]+)"" customer group$")]
    public async Task WhenTreasuryOpsOpensAnAccountInTheCustomerGroup(string groupName)
    {
        var group = await SucceedsAsync(GroupsPath,
            new { code = "ACME", name = groupName, type = "Customer", ownerId = "PayHub" },
            $"creating Customer group {groupName}");
        var account = await SucceedsAsync(AccountsPath, new
        {
            groupId = group.GetProperty("id").GetGuid(),
            name = "Wallet EUR",
            currency = "EUR",
            classification = "Liability",
            permittedToGoNegative = false
        }, $"opening a EUR account in {groupName}");
        _accountNumber = account.GetProperty("accountNumber").GetString();
    }

    [Then(@"^no request reaches the notification service$")]
    public async Task ThenNoRequestReachesTheNotificationService()
    {
        // Positive control: the account-opened event left the API, so a reader of it has had its chance to act.
        bool IsOurs(OutboundEvent e) =>
            e.Type == "accounts.created"
            && e.Payload.ValueKind == JsonValueKind.Object
            && e.Payload.GetProperty("accountNumber").GetString() == _accountNumber;

        (await _ledgerReader!.WaitUntilAsync(events => events.Any(IsOurs), Arrival))
            .ShouldBeTrue($"no accounts.created event for {_accountNumber}. {_ledgerReader.Describe()}");

        (await Eventually.IsTrueAsync(() => _notification.Requests.Count > 0, Watch))
            .ShouldBeFalse($"the Accounts API sent a notification request: {string.Join(Environment.NewLine,
                _notification.Requests)}");
    }

    private async Task<JsonElement> SucceedsAsync(string uri, object body, string what)
    {
        var response = await Client.SendAsCallerAsync(state, HttpMethod.Post, uri, body);
        state.Response = response;
        state.ResponseBody = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.Created, $"{what}: {state.ResponseBody}");
        return JsonDocument.Parse(state.ResponseBody).RootElement.Clone();
    }
}

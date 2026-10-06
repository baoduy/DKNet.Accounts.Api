using System.Globalization;
using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-2120 surface B (IdempotencyKeyCase.feature) and the PostgreSQL search scenario of
/// DatabaseChoice.feature. "Account 10001" and "posting 20001" are scenario names for an account and a posting
/// these steps open and record, not the service-issued numbers. The @integration steps run on the run-shared
/// PostgreSQL host; the Turkish @unit scenario runs on an in-memory host of its own.
/// </summary>
[Binding]
public sealed class IdempotencyKeyCaseSteps(HttpClient client, ScenarioState state, BddApiFactory factory)
{
    private const string PostingsPath = "/v1/postings";

    private readonly Dictionary<string, Guid> _accounts = [];
    private readonly Dictionary<string, Guid> _postings = [];
    private Func<string, Task<HttpResponseMessage>>? _lastRequest;
    private int _postingsAfterOneResult;
    private HttpResponseMessage? _first;
    private HttpResponseMessage? _second;
    private Guid _lastPostingId;
    private Guid[] _firstIds = [];
    private Guid _searchedAccount;
    private string? _searchedDescription;
    private CultureInfo? _serverCulture;
    private InMemoryLedgerApiFactory? _inMemoryHost;

    [AfterScenario]
    public async Task DisposeInMemoryHostAsync()
    {
        if (_inMemoryHost is not null)
        {
            await _inMemoryHost.DisposeAsync();
        }
    }

    #region Given

    [Given(@"^""([^""]+)"" (?:records|recorded) a ([\d.]+) (\w+) credit on account (\d+) with idempotency key ""([^""]*)""$")]
    [When(@"^""([^""]+)"" (?:records|recorded) a ([\d.]+) (\w+) credit on account (\d+) with idempotency key ""([^""]*)""$")]
    public async Task RecordsACreditOnAccountWithIdempotencyKey(
        string callingSystem, decimal amount, string currency, string account, string key)
    {
        var accountId = await AccountAsync(account);
        _postingsAfterOneResult = 1;
        await SendAsync(callingSystem, k => SendAsCallerAsync(HttpMethod.Post, PostingsPath, new
        {
            accountId, direction = "Credit", amount, currency, category = "Transfer"
        }, k), key);
    }

    [Given(@"^""([^""]+)"" (?:records|recorded) a batch of 2 postings on account (\d+) with idempotency key ""([^""]*)""$")]
    [When(@"^""([^""]+)"" (?:records|recorded) a batch of 2 postings on account (\d+) with idempotency key ""([^""]*)""$")]
    public async Task RecordsABatchOf2PostingsOnAccountWithIdempotencyKey(string callingSystem, string account, string key)
    {
        var accountId = await AccountAsync(account);
        _postingsAfterOneResult = 2;
        await SendAsync(callingSystem, k => SendAsCallerAsync(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId, direction = "Credit", amount = 60.00m, currency = "SGD", category = "Transfer" },
                new { accountId, direction = "Credit", amount = 40.00m, currency = "SGD", category = "Transfer" }
            }
        }, k), key);
    }

    [Given(@"^""([^""]+)"" reversed posting (\d+) for ""([^""]+)"" with idempotency key ""([^""]*)""$")]
    public async Task GivenReversedPostingForWithIdempotencyKey(string callingSystem, string posting, string reason, string key)
    {
        AsCaller(callingSystem);
        var accountId = await AccountAsync("10001");
        var recorded = await SendAsCallerAsync(HttpMethod.Post, PostingsPath, new
        {
            accountId, direction = "Credit", amount = 100.00m, currency = "SGD", category = "Transfer"
        });
        recorded.StatusCode.ShouldBe(HttpStatusCode.Created);
        _postings[posting] = await ReadIdAsync(recorded);

        // The original posting and its one reversal.
        _postingsAfterOneResult = 2;
        await SendAsync(callingSystem, k => SendAsCallerAsync(
            HttpMethod.Post, $"{PostingsPath}/{_postings[posting]}/reverse", new { reason }, k), key);
    }

    [Given(@"^account (\d+) holds a posting described ""([^""]+)""$")]
    public async Task GivenAccountHoldsAPostingDescribed(string account, string description)
    {
        AsCaller("treasury-ops");
        _searchedAccount = await AccountAsync(account);
        _searchedDescription = description;
        var response = await SendAsCallerAsync(HttpMethod.Post, PostingsPath, new
        {
            accountId = _searchedAccount, direction = "Credit", amount = 100.00m, currency = "SGD",
            category = "Transfer", description
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    /// <summary>The culture is only remembered here and applied around the request itself in the When step: a
    /// culture set inside an async step does not survive into the next step.</summary>
    [Given(@"^the server's language is Turkish$")]
    public void GivenTheServersLanguageIsTurkish()
    {
        _serverCulture = CultureInfo.GetCultureInfo("tr-TR");

        // Precondition: this runtime has Turkish casing rules (ICU), so a culture-sensitive lowercase would
        // differ — otherwise the scenario could not tell the two apart.
        "TITLE".ToLower(_serverCulture).ShouldBe("tıtle");
    }

    #endregion

    #region When

    [When(@"^""([^""]+)"" repeats that request with idempotency key ""([^""]*)""$")]
    public async Task WhenRepeatsThatRequestWithIdempotencyKey(string callingSystem, string key)
    {
        AsCaller(callingSystem);
        _second = await _lastRequest!(key);
    }

    [When(@"^""([^""]+)"" reads that posting$")]
    public async Task WhenReadsThatPosting(string callingSystem)
    {
        AsCaller(callingSystem);
        state.Response = await SendAsCallerAsync(HttpMethod.Get, $"{PostingsPath}/{_lastPostingId}");
    }

    [When(@"^""([^""]+)"" searches postings for ""([^""]+)""$")]
    public async Task WhenSearchesPostingsFor(string callingSystem, string term)
    {
        AsCaller(callingSystem);
        state.Response = await SearchAsync(term);
    }

    /// <summary>
    /// Runs on an in-memory host whose test server keeps the caller's execution context, so the culture set here
    /// is the culture the server reads, binds and handles the request under. Restored before the step returns.
    /// </summary>
    [When(@"^""([^""]+)"" records a posting with idempotency key ""([^""]+)""$")]
    public async Task WhenRecordsAPostingWithIdempotencyKey(string callingSystem, string key)
    {
        AsCaller(callingSystem);
        _inMemoryHost = await InMemoryLedgerApiFactory.StartAsync();
        var accountId = await OpenAccountAsync(_inMemoryHost.Client, "10001");

        var culture = CultureInfo.CurrentCulture;
        var uiCulture = CultureInfo.CurrentUICulture;
        CultureInfo.CurrentCulture = _serverCulture!;
        CultureInfo.CurrentUICulture = _serverCulture!;
        try
        {
            state.Response = await _inMemoryHost.Client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
            {
                accountId, direction = "Credit", amount = 100.00m, currency = "SGD", category = "Transfer"
            }, key);
        }
        finally
        {
            CultureInfo.CurrentCulture = culture;
            CultureInfo.CurrentUICulture = uiCulture;
        }

        state.Response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    #endregion

    #region Then

    [Then(@"^the second call is a replay of the first$")]
    public async Task ThenTheSecondCallIsAReplayOfTheFirst()
    {
        _first!.IsSuccessStatusCode.ShouldBeTrue();
        _second!.StatusCode.ShouldBe(HttpStatusCode.OK, await _second.Content.ReadAsStringAsync());
        (await ReadIdsAsync(_second)).ShouldBe(_firstIds);
    }

    [Then(@"^only one result is recorded$")]
    public async Task ThenOnlyOneResultIsRecorded() =>
        (await CountPostingsAsync("10001")).ShouldBe(_postingsAfterOneResult);

    [Then(@"^the call is refused with 409 ""([^""]+)""$")]
    public async Task ThenTheCallIsRefusedWith409(string code)
    {
        _second!.StatusCode.ShouldBe(HttpStatusCode.Conflict, await _second.Content.ReadAsStringAsync());
        var doc = await _second.Content.ReadFromJsonAsync<JsonElement>();
        doc.GetProperty("errors").EnumerateArray()
            .Count(e => e.TryGetProperty("code", out var c) && c.GetString() == code)
            .ShouldBe(1, doc.ToString());
    }

    [Then(@"^no new posting is recorded$")]
    public async Task ThenNoNewPostingIsRecorded() => (await CountPostingsAsync("10001")).ShouldBe(1);

    [Then(@"^the posting shows idempotency key ""([^""]+)""$")]
    public async Task ThenThePostingShowsIdempotencyKey(string key)
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK);
        var doc = await state.Response.Content.ReadFromJsonAsync<JsonElement>();
        doc.GetProperty("idempotencyKey").GetString().ShouldBe(key);
    }

    [Then(@"^account (\d+) holds (\d+) postings$")]
    public async Task ThenAccountHoldsPostings(string account, int count) =>
        (await CountPostingsAsync(account)).ShouldBe(count);

    [Then(@"^the stored key is ""([^""]+)""$")]
    public void ThenTheStoredKeyIs(string key)
    {
        using var scope = _inMemoryHost!.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<CoreDbContext>().Set<Posting>()
            .Select(p => p.IdempotencyKey)
            .ToList()
            .ShouldBe([key]);
    }

    /// <summary>The same search with the description's own case finds the posting, so the empty answer above
    /// is the case rule and not a window or permission that matches nothing.</summary>
    [Then(@"^no posting is found$")]
    public async Task ThenNoPostingIsFound()
    {
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await state.Response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items").GetArrayLength().ShouldBe(0);

        var exactCase = await SearchAsync("ACME-77");
        exactCase.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = (await exactCase.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items");
        items.GetArrayLength().ShouldBe(1);
        items[0].GetProperty("description").GetString().ShouldBe(_searchedDescription);
    }

    #endregion

    #region Helpers

    private void AsCaller(string callingSystem)
    {
        state.CallerClientId = callingSystem;
        state.CallerScopes = [.. ScopeNames.All];
    }

    private Task<HttpResponseMessage> SendAsCallerAsync(HttpMethod method, string uri, object? body = null, string? key = null) =>
        client.SendAsCallerAsync(state, method, uri, body, key);

    /// <summary>Sends a request as <paramref name="callingSystem"/> under <paramref name="key"/> and keeps it so
    /// a later step can repeat it under another key. The first such call of a scenario is the one a repeat is
    /// compared against; any later one is the call under test.</summary>
    private async Task SendAsync(string callingSystem, Func<string, Task<HttpResponseMessage>> request, string key)
    {
        AsCaller(callingSystem);
        _lastRequest = request;
        var response = await request(key);
        if (_first is null)
        {
            _first = response;
            response.IsSuccessStatusCode.ShouldBeTrue(await response.Content.ReadAsStringAsync());
            _firstIds = await ReadIdsAsync(response);
            _lastPostingId = _firstIds[0];
        }
        else
        {
            _second = response;
        }
    }

    private async Task<Guid> AccountAsync(string account)
    {
        if (!_accounts.TryGetValue(account, out var id))
        {
            var caller = state.CallerClientId;
            AsCaller("treasury-ops");
            id = _accounts[account] = await OpenAccountAsync(client, account);
            state.CallerClientId = caller;
        }

        return id;
    }

    private async Task<Guid> OpenAccountAsync(HttpClient host, string account)
    {
        var group = await host.SendAsCallerAsync(state, HttpMethod.Post, "/v1/account-groups", new
        {
            code = $"G{Guid.NewGuid():N}"[..5].ToUpperInvariant(), name = $"Group for {account}", type = "Customer",
            ownerId = state.CallerClientId
        });
        group.StatusCode.ShouldBe(HttpStatusCode.Created, await group.Content.ReadAsStringAsync());

        var opened = await host.SendAsCallerAsync(state, HttpMethod.Post, "/v1/accounts", new
        {
            groupId = await ReadIdAsync(group), name = $"Account {account}", currency = "SGD", classification = "Liability"
        });
        opened.StatusCode.ShouldBe(HttpStatusCode.Created, await opened.Content.ReadAsStringAsync());
        return await ReadIdAsync(opened);
    }

    private async Task<int> CountPostingsAsync(string account)
    {
        using var scope = factory.CreateScope();
        var accountId = _accounts[account];
        return await scope.ServiceProvider.GetRequiredService<CoreDbContext>().Set<Posting>()
            .CountAsync(p => p.AccountId == accountId);
    }

    private Task<HttpResponseMessage> SearchAsync(string term)
    {
        var today = DateOnly.FromDateTime(factory.Clock.GetUtcNow().UtcDateTime).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return SendAsCallerAsync(
            HttpMethod.Get,
            $"{PostingsPath}?from={today}&to={today}&accountId={_searchedAccount}&search={Uri.EscapeDataString(term)}");
    }

    private static async Task<Guid> ReadIdAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

    /// <summary>The posting ids in a response: one for a posting, one per leg for a batch.</summary>
    private static async Task<Guid[]> ReadIdsAsync(HttpResponseMessage response)
    {
        var doc = await response.Content.ReadFromJsonAsync<JsonElement>();
        return doc.ValueKind == JsonValueKind.Array
            ? [.. doc.EnumerateArray().Select(e => e.GetProperty("id").GetGuid())]
            : [doc.GetProperty("id").GetGuid()];
    }

    #endregion

    /// <summary>
    /// The in-memory host (<see cref="TestApiFactoryBase"/>'s default database) with the ledger caller handler,
    /// and a test server that keeps the client's execution context — culture included — on the server side.
    /// </summary>
    private sealed class InMemoryLedgerApiFactory : TestApiFactoryBase
    {
        private const string RequireAuthorizationEnvKey = "FeatureManagement__RequireAuthorization";

        public HttpClient Client { get; private set; } = null!;

        public static async Task<InMemoryLedgerApiFactory> StartAsync()
        {
            var host = new InMemoryLedgerApiFactory();
            Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, "true");
            try
            {
                // Read by each client handler when it is created, so it is set before the client is.
                host.Server.PreserveExecutionContext = true;
            }
            finally
            {
                Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, null);
            }

            host.Client = host.CreateClient();
            await host.ResetDatabaseAsync();
            return host;
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            base.ConfigureTestServices(services);
            LedgerCallerAuthHandler.Register(services);
        }
    }
}

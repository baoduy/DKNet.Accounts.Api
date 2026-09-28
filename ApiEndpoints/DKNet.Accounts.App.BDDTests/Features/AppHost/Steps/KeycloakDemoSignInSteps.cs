using System.Diagnostics;
using System.Net.Http.Json;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.App.BDDTests.Features.AppHost.Steps;

/// <summary>
/// Step bindings for DRK-1796 §5 (<c>KeycloakDemoSignIn.feature</c>). "AppHost is running" is the real AppHost,
/// started once per run (<see cref="AppHostRun"/>); every sign-in goes through the Keycloak it started, and every
/// ledger call goes to <see cref="KeycloakApiFactory"/>, the ledger service with AppHost's own sign-in settings.
/// </summary>
/// <remarks>
/// "OPS-001" and "OPS-002" are account names: an account number is the group code plus a suffix the ledger
/// chooses. Each ledger scenario opens OPS-001 with its 100.00 SGD credit in a group of its own, as "admin".
/// </remarks>
[Binding]
[Scope(Feature = FeatureName)]
public sealed class KeycloakDemoSignInSteps
{
    private const string FeatureName = "The AppHost demo signs in through a local Keycloak";
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    private HttpResponseMessage? _response;
    private string _responseBody = "";
    private string? _platform;
    private string? _adminScreenToken;
    private IReadOnlyList<string> _realms = [];
    private readonly List<string> _reachedFromOutside = [];
    private readonly List<string> _outsideAddresses = [];
    private readonly List<string> _adminScreenFromOutside = [];
    private string _trafficGenOutput = "";
    private (HashSet<Guid> Groups, HashSet<Guid> Accounts, HashSet<Guid> Postings) _before;
    private (List<AccountGroup> Groups, List<Account> Accounts, List<Posting> Postings) _created;

    [AfterFeature("apphost")]
    public static async Task AfterFeatureAsync()
    {
        await KeycloakApiFactory.DisposeCurrentAsync();
        await AppHostRun.StopCurrentAsync();
    }

    #region Given

    [Given(@"AppHost is running")]
    [Given(@"AppHost is running on a developer's first laptop")]
    public async Task GivenAppHostIsRunning() => await AppHostRun.EnsureRunningAsync();

    [Given(@"a developer works on (.+)")]
    public void GivenADeveloperWorksOn(string machine) =>
        _platform = machine.Contains("arm64", StringComparison.Ordinal) ? "linux/arm64"
            : machine.Contains("amd64", StringComparison.Ordinal) ? "linux/amd64"
            : throw new ArgumentOutOfRangeException(nameof(machine), machine, "neither arm64 nor amd64");

    [Given(@"a developer added the user ""([^""]+)"" in the Keycloak admin screen")]
    public async Task GivenADeveloperAddedTheUserInTheKeycloakAdminScreen(string user)
    {
        await AppHostRun.EnsureRunningAsync();
        var token = await DemoRealm.SignInToAdminScreenAsync(DemoRealm.AdminLogin, DemoRealm.AdminLogin);
        await DemoRealm.AddUserAsync(token, user);
        (await DemoRealm.UserNamesAsync(token)).ShouldContain(user);
    }

    #endregion

    #region When

    [When(@"(.+) asks the ledger service to (.+)")]
    public async Task WhenAsksTheLedgerServiceTo(string caller, string action)
    {
        var ledger = await KeycloakApiFactory.CurrentAsync();
        var admin = await SignInAsync("admin");
        var (groupId, postingId) = await OpenOps001Async(ledger.Client, admin);

        var token = await TokenForAsync(caller, admin, ledger);
        using var request = action switch
        {
            @"open account ""OPS-002""" => new HttpRequestMessage(HttpMethod.Post, AccountsPath)
            {
                Content = JsonContent.Create(new
                {
                    groupId, name = "OPS-002", currency = "SGD", classification = "Liability", permittedToGoNegative = false
                })
            },
            @"reverse the 100.00 SGD posting on ""OPS-001""" => new HttpRequestMessage(HttpMethod.Post,
                $"{PostingsPath}/{postingId}/reverse")
            {
                Content = JsonContent.Create(new { reason = "Recorded in error" }),
                Headers = { { "Idempotency-Key", $"rev-{Guid.NewGuid():N}" } }
            },
            _ => throw new ArgumentOutOfRangeException(nameof(action), action, "no such ledger action")
        };
        if (token is not null)
        {
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }

        _response = await ledger.Client.SendAsync(request);
        _responseBody = await _response.Content.ReadAsStringAsync();
    }

    [When(@"TrafficGen is started from the AppHost dashboard")]
    public async Task WhenTrafficGenIsStartedFromTheAppHostDashboard()
    {
        var ledger = await KeycloakApiFactory.CurrentAsync();
        _before = await LedgerIdsAsync(ledger);

        var environment = AppHostRun.Manifest.Environment("TrafficGen",
            key => !key.StartsWith("OTEL_", StringComparison.Ordinal) && key is not ("HTTP_PORTS" or "HTTPS_PORTS"),
            new Dictionary<string, string> { ["{Api.bindings.http.url}"] = ledger.BaseAddress.ToString().TrimEnd('/') });
        environment.Values.ShouldContain(DemoRealm.MachineClientId(),
            "AppHost must hand TrafficGen its own machine client of the demo realm.");

        var start = new ProcessStartInfo("dotnet") { RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var argument in new[]
                 {
                     "run", "--no-launch-profile", "--project",
                     Path.Combine(Cli.RepoRoot(), "ApiEndpoints", "DKNet.Accounts.TrafficGen", "DKNet.Accounts.TrafficGen.csproj")
                 })
        {
            start.ArgumentList.Add(argument);
        }

        foreach (var (key, value) in environment)
        {
            start.Environment[key] = value;
        }

        // The traffic's own pace — a fixture choice, not a scenario value.
        start.Environment["TrafficGen__IntervalSeconds"] = "1";
        start.Environment["TrafficGen__CurrenciesPerCycle"] = "1";
        start.Environment["TrafficGen__PostingsPerAccount"] = "2";

        var output = new StringBuilder();
        using var trafficGen = Process.Start(start)!;
        trafficGen.OutputDataReceived += (_, e) => { lock (output) output.AppendLine(e.Data); };
        trafficGen.ErrorDataReceived += (_, e) => { lock (output) output.AppendLine(e.Data); };
        trafficGen.BeginOutputReadLine();
        trafficGen.BeginErrorReadLine();
        try
        {
            var deadline = DateTime.UtcNow + TimeSpan.FromMinutes(2);
            do
            {
                await Task.Delay(TimeSpan.FromSeconds(2));
                _created = await CreatedSinceAsync(ledger);
            } while (!trafficGen.HasExited && DateTime.UtcNow < deadline
                     && (_created.Groups.Count == 0 || _created.Accounts.Count == 0 || _created.Postings.Count == 0));
        }
        finally
        {
            if (!trafficGen.HasExited)
            {
                trafficGen.Kill(entireProcessTree: true);
            }

            await trafficGen.WaitForExitAsync();
            lock (output)
            {
                _trafficGenOutput = output.ToString();
            }
        }

        _created = await CreatedSinceAsync(ledger);
    }

    [When(@"a developer signs in to the Keycloak admin screen as ""([^""]+)"" with password ""([^""]+)""")]
    public async Task WhenADeveloperSignsInToTheKeycloakAdminScreen(string user, string password)
    {
        _adminScreenToken = await DemoRealm.SignInToAdminScreenAsync(user, password);
        _realms = await DemoRealm.RealmNamesAsync(_adminScreenToken);
    }

    [When(@"the developer starts AppHost")]
    public async Task WhenTheDeveloperStartsAppHost() => await AppHostRun.EnsureRunningAsync();

    /// <summary>
    /// The second laptop is played by this machine's own non-loopback addresses — its Wi-Fi/LAN address, and the
    /// Docker bridge's — which is how any other machine on the network reaches it. It tries Keycloak's fixed port
    /// and every host port the Keycloak container publishes.
    /// </summary>
    [When(@"a second laptop on the same Wi-Fi network tries to reach Keycloak on the first laptop")]
    public async Task WhenASecondLaptopTriesToReachKeycloak()
    {
        var published = PublishedPorts((await AppHostRun.EnsureRunningAsync()).KeycloakContainerId());
        var ports = published.Select(p => p.Port).Append(AppHostRun.KeycloakPort).Distinct().ToArray();

        foreach (var address in OutsideAddresses())
        {
            _outsideAddresses.Add(address.ToString());
            foreach (var port in ports)
            {
                if (await ConnectsAsync(address, port))
                {
                    _reachedFromOutside.Add($"{Endpoint(address, port)}");
                }
            }

            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            try
            {
                using var screen = await http.GetAsync($"http://{Endpoint(address, AppHostRun.KeycloakPort)}/admin/");
                _adminScreenFromOutside.Add($"{Endpoint(address, AppHostRun.KeycloakPort)} answered {(int)screen.StatusCode}");
            }
            catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
            {
                // Refused: what the scenario expects.
            }
        }

        foreach (var (hostIp, port) in published)
        {
            if (!IPAddress.TryParse(hostIp.Trim('[', ']'), out var ip) || !IPAddress.IsLoopback(ip))
            {
                _reachedFromOutside.Add($"the Keycloak container publishes port {port} on '{hostIp}', not on loopback");
            }
        }
    }

    [When(@"AppHost is restarted")]
    public async Task WhenAppHostIsRestarted() => await AppHostRun.RestartAsync();

    #endregion

    #region Then

    [Then(@"the ledger service answers (.+)")]
    public void ThenTheLedgerServiceAnswers(string result)
    {
        var status = _response!.StatusCode;
        switch (result)
        {
            case "401, not signed in":
                status.ShouldBe(HttpStatusCode.Unauthorized, _responseBody);
                break;
            case "403, forbidden":
                status.ShouldBe(HttpStatusCode.Forbidden, _responseBody);
                break;
            case "success":
                _response.IsSuccessStatusCode.ShouldBeTrue($"{(int)status}: {_responseBody}");
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(result), result, "no such answer");
        }
    }

    [Then(@"new groups, accounts and postings appear in the ledger")]
    public void ThenNewGroupsAccountsAndPostingsAppearInTheLedger()
    {
        _created.Groups.ShouldNotBeEmpty($"TrafficGen created no account group:\n{_trafficGenOutput}");
        _created.Accounts.ShouldNotBeEmpty($"TrafficGen opened no account:\n{_trafficGenOutput}");
        _created.Postings.ShouldNotBeEmpty($"TrafficGen recorded no posting:\n{_trafficGenOutput}");
    }

    /// <summary>
    /// A posting records its calling system; a group and an account record who created them, which the ledger takes
    /// from the token's subject — for a client-credentials token, the client's own service-account user in Keycloak
    /// (the client id itself when the token carries no subject).
    /// </summary>
    [Then(@"each of them names TrafficGen's own client as the calling system, not ""System""")]
    public async Task ThenEachOfThemNamesTrafficGensOwnClient()
    {
        var clientId = DemoRealm.MachineClientId();
        var adminToken = await DemoRealm.SignInToAdminScreenAsync(DemoRealm.AdminLogin, DemoRealm.AdminLogin);
        string[] client = [clientId, await DemoRealm.ServiceAccountUserIdAsync(adminToken, clientId)];

        _created.Postings.Select(p => p.CallingSystem).Distinct().ShouldBe([clientId]);
        _created.Groups.Select(g => g.CreatedBy).ShouldAllBe(by => client.Contains(by));
        _created.Accounts.Select(a => a.CreatedBy).ShouldAllBe(by => client.Contains(by));
        _created.Postings.Select(p => p.CallingSystem)
            .Concat(_created.Groups.Select(g => g.CreatedBy))
            .Concat(_created.Accounts.Select(a => a.CreatedBy))
            .ShouldNotContain(SharedConsts.SystemAccount);
    }

    [Then(@"the demo realm is listed")]
    public void ThenTheDemoRealmIsListed() => _realms.ShouldContain(AppHostRun.RealmName);

    [Then(@"Keycloak is running with the demo realm loaded")]
    public async Task ThenKeycloakIsRunningWithTheDemoRealmLoaded()
    {
        using var http = new HttpClient();
        var discovery = await http.GetFromJsonAsync<JsonElement>($"{AppHostRun.RealmIssuer}/.well-known/openid-configuration");
        discovery.GetProperty("issuer").GetString().ShouldBe(AppHostRun.RealmIssuer);

        var container = (await AppHostRun.EnsureRunningAsync()).KeycloakContainerId();
        var image = Cli.Run("docker", "inspect", "--format", "{{.Config.Image}}", container).Trim();
        using var manifest = JsonDocument.Parse(Cli.Run("docker", "manifest", "inspect", image));
        var platforms = manifest.RootElement.TryGetProperty("manifests", out var manifests)
            ? manifests.EnumerateArray()
                .Select(m => m.GetProperty("platform"))
                .Select(p => $"{p.GetProperty("os").GetString()}/{p.GetProperty("architecture").GetString()}")
                .ToArray()
            : [];
        platforms.ShouldContain(_platform!, $"Keycloak's image '{image}' is not published for {_platform}.");
    }

    [Then(@"the connection is refused")]
    public async Task ThenTheConnectionIsRefused()
    {
        _outsideAddresses.ShouldNotBeEmpty("this machine has no non-loopback address to play the second laptop.");
        (await AppHostRun.IsListeningAsync(AppHostRun.KeycloakPort)).ShouldBeTrue(
            "Keycloak must still accept connections from the developer's own machine.");
        _reachedFromOutside.ShouldBeEmpty();
    }

    [Then(@"the Keycloak admin screen cannot be opened from the second laptop")]
    public async Task ThenTheKeycloakAdminScreenCannotBeOpenedFromTheSecondLaptop()
    {
        using var http = new HttpClient();
        using var local = await http.GetAsync($"{AppHostRun.KeycloakBase}admin/");
        local.IsSuccessStatusCode.ShouldBeTrue("the admin screen must open on the developer's own machine.");
        _adminScreenFromOutside.ShouldBeEmpty();
    }

    [Then(@"the demo realm holds only ""([^""]+)"", ""([^""]+)"" and ""([^""]+)""")]
    public async Task ThenTheDemoRealmHoldsOnly(string first, string second, string third)
    {
        var token = await DemoRealm.SignInToAdminScreenAsync(DemoRealm.AdminLogin, DemoRealm.AdminLogin);
        (await DemoRealm.UserNamesAsync(token)).ShouldBe([first, second, third]);
    }

    #endregion

    #region Helpers

    private static ConsoleClient ConsoleSignIn()
    {
        var env = AppHostRun.Manifest.Environment("UI", key => key.StartsWith("CONSOLE_ENTRA_", StringComparison.Ordinal));
        return new ConsoleClient(
            env.GetValueOrDefault("CONSOLE_ENTRA_CLIENT_ID").ShouldNotBeNull("AppHost must hand the console its client id."),
            env.GetValueOrDefault("CONSOLE_ENTRA_CLIENT_SECRET").ShouldNotBeNull("AppHost must hand the console its client secret."),
            env.GetValueOrDefault("CONSOLE_ENTRA_SCOPES").ShouldNotBeNull("AppHost must hand the console its scopes."));
    }

    /// <summary>DRK-1796 §3: each demo user's password equals the user name.</summary>
    private static Task<string> SignInAsync(string user) => DemoRealm.SignInAsync(user, user, ConsoleSignIn());

    private async Task<string?> TokenForAsync(string caller, string adminToken, KeycloakApiFactory ledger)
    {
        if (caller == "a caller with no token")
        {
            return null;
        }

        var variant = System.Text.RegularExpressions.Regex.Match(caller, @"^""(?<user>[^""]+)""(?: with (?<token>.+))?$");
        variant.Success.ShouldBeTrue($"no such caller: {caller}");
        var user = variant.Groups["user"].Value;
        if (!variant.Groups["token"].Success)
        {
            return user == "admin" ? adminToken : await SignInAsync(user);
        }

        // The admin's own token, re-signed with the key the scenarios added to the realm: only the one claim the row
        // names differs. The unchanged copy must be accepted, or a refusal below would prove nothing.
        var claims = DemoRealm.Payload(user == "admin" ? adminToken : await SignInAsync(user));
        var signer = ledger.ScenarioSigner;
        using (var control = new HttpRequestMessage(HttpMethod.Get, AccountsPath))
        {
            control.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", signer.Sign(claims, _ => { }));
            using var accepted = await ledger.Client.SendAsync(control);
            accepted.StatusCode.ShouldBe(HttpStatusCode.OK,
                "the ledger must accept the realm-signed copy of the admin's token before a changed one can prove anything.");
        }

        var now = DateTimeOffset.UtcNow;
        return variant.Groups["token"].Value switch
        {
            "an expired token" => signer.Sign(claims, c =>
            {
                c["iat"] = JsonSerializer.SerializeToElement(now.AddHours(-2).ToUnixTimeSeconds());
                c["exp"] = JsonSerializer.SerializeToElement(now.AddHours(-1).ToUnixTimeSeconds());
                c.Remove("nbf");
            }),
            "a token issued for another audience" => signer.Sign(claims,
                c => c["aud"] = JsonSerializer.SerializeToElement("another-api")),
            "a token from another sign-in server" => DemoRealm.UnknownSigningKey().Sign(claims,
                c => c["iss"] = JsonSerializer.SerializeToElement($"https://another-sign-in.example/realms/{AppHostRun.RealmName}")),
            var other => throw new ArgumentOutOfRangeException(nameof(caller), other, "no such token")
        };
    }

    /// <summary>A group of the scenario's own, account "OPS-001" in SGD and a 100.00 SGD credit on it.</summary>
    private static async Task<(Guid GroupId, Guid PostingId)> OpenOps001Async(HttpClient ledger, string adminToken)
    {
        var groupId = await CreateAsync(ledger, adminToken, "/v1/account-groups", new
        {
            code = $"O{Guid.NewGuid():N}"[..5].ToUpperInvariant(), name = "OPS", type = "Customer", ownerId = "apphost-demo"
        });
        var accountId = await CreateAsync(ledger, adminToken, AccountsPath, new
        {
            groupId, name = "OPS-001", currency = "SGD", classification = "Liability", permittedToGoNegative = false
        });
        var postingId = await CreateAsync(ledger, adminToken, PostingsPath, new
        {
            accountId, direction = "Credit", amount = 100.00m, currency = "SGD", category = "Transfer"
        });
        return (groupId, postingId);
    }

    private static async Task<Guid> CreateAsync(HttpClient ledger, string token, string path, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        using var response = await ledger.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        response.IsSuccessStatusCode.ShouldBeTrue($"admin could not POST {path}: {(int)response.StatusCode} {text}");
        return JsonDocument.Parse(text).RootElement.GetProperty("id").GetGuid();
    }

    private static async Task<(HashSet<Guid>, HashSet<Guid>, HashSet<Guid>)> LedgerIdsAsync(KeycloakApiFactory ledger)
    {
        using var scope = ledger.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        return ([.. await db.Set<AccountGroup>().Select(g => g.Id).ToListAsync()],
            [.. await db.Set<Account>().Select(a => a.Id).ToListAsync()],
            [.. await db.Set<Posting>().Select(p => p.Id).ToListAsync()]);
    }

    private async Task<(List<AccountGroup>, List<Account>, List<Posting>)> CreatedSinceAsync(KeycloakApiFactory ledger)
    {
        using var scope = ledger.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        return ((await db.Set<AccountGroup>().AsNoTracking().ToListAsync()).Where(g => !_before.Groups.Contains(g.Id)).ToList(),
            (await db.Set<Account>().AsNoTracking().ToListAsync()).Where(a => !_before.Accounts.Contains(a.Id)).ToList(),
            (await db.Set<Posting>().AsNoTracking().ToListAsync()).Where(p => !_before.Postings.Contains(p.Id)).ToList());
    }

    private static IReadOnlyList<(string HostIp, int Port)> PublishedPorts(string container)
    {
        using var ports = JsonDocument.Parse(Cli.Run("docker", "inspect", "--format", "{{json .NetworkSettings.Ports}}", container));
        return [.. ports.RootElement.EnumerateObject()
            .Where(p => p.Value.ValueKind == JsonValueKind.Array)
            .SelectMany(p => p.Value.EnumerateArray())
            .Select(b => (b.GetProperty("HostIp").GetString() ?? "", int.Parse(b.GetProperty("HostPort").GetString()!,
                System.Globalization.CultureInfo.InvariantCulture)))];
    }

    private static IEnumerable<IPAddress> OutsideAddresses() =>
        NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses)
            .Select(a => a.Address)
            .Where(a => !IPAddress.IsLoopback(a) && !a.IsIPv6LinkLocal
                        && a.AddressFamily is AddressFamily.InterNetwork or AddressFamily.InterNetworkV6)
            .Distinct();

    private static string Endpoint(IPAddress address, int port) =>
        address.AddressFamily == AddressFamily.InterNetworkV6 ? $"[{address}]:{port}" : $"{address}:{port}";

    private static async Task<bool> ConnectsAsync(IPAddress address, int port)
    {
        using var socket = new TcpClient(address.AddressFamily);
        try
        {
            await socket.ConnectAsync(address, port).WaitAsync(TimeSpan.FromSeconds(3));
            return true;
        }
        catch (Exception e) when (e is SocketException or TimeoutException)
        {
            return false;
        }
    }

    #endregion
}

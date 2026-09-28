using System.Diagnostics;
using System.Net.Sockets;
using System.Text.RegularExpressions;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// The Aspire host of DRK-1796, run the way a developer runs it: <c>dotnet run</c> on the AppHost project, with no
/// Entra ID values anywhere. <see cref="Manifest"/> is the host's own description of its wiring (Aspire's manifest
/// publisher), so the scenarios read which Keycloak it starts and what it hands the ledger service, the console
/// and TrafficGen from Aspire itself rather than from the program's text.
/// </summary>
/// <remarks>
/// Only the Keycloak resource of the running host is used by the scenarios. The ledger service and TrafficGen run
/// in-process with the settings the manifest gives them (<see cref="KeycloakApiFactory"/>), so a busy port 5000
/// or 3000 on the developer's machine, which only the host's own Api and console resources need, changes nothing.
/// </remarks>
public sealed partial class AppHostRun
{
    /// <summary>DRK-1796 §9 Q2: the demo realm's name.</summary>
    public const string RealmName = "dknet-accounts";

    /// <summary>DRK-1796 §9 Q2: the audience every token of the realm names — the ledger service.</summary>
    public const string LedgerAudience = "dknet-accounts-api";

    /// <summary>DRK-1796 §9 Q2 and R1: Keycloak's fixed host port.</summary>
    public const int KeycloakPort = 8180;

    /// <summary>Keycloak as the developer's own machine reaches it.</summary>
    public static readonly Uri KeycloakBase = new($"http://localhost:{KeycloakPort}");

    /// <summary>The realm's issuer as every token it issues names it.</summary>
    public static readonly string RealmIssuer = $"{KeycloakBase.ToString().TrimEnd('/')}/realms/{RealmName}";

    private static readonly TimeSpan StartTimeout = TimeSpan.FromMinutes(6);
    private static readonly TimeSpan StopTimeout = TimeSpan.FromMinutes(1);

    private static AppHostRun? _current;
    private static AppHostManifest? _manifest;

    private readonly Process _process;
    private readonly StringBuilder _output = new();

    private AppHostRun(Process process)
    {
        _process = process;
        _process.OutputDataReceived += (_, e) => Append(e.Data);
        _process.ErrorDataReceived += (_, e) => Append(e.Data);
        _process.BeginOutputReadLine();
        _process.BeginErrorReadLine();
    }

    /// <summary>Counts the host's starts: whatever holds the realm's keys (<see cref="KeycloakApiFactory"/>) belongs
    /// to one start, since a restarted Keycloak signs with new keys.</summary>
    public static int Generation { get; private set; }

    /// <summary>The AppHost's wiring, published once per test run.</summary>
    public static AppHostManifest Manifest => _manifest ??= AppHostManifest.Publish();

    /// <summary>The running host, started on first use and kept for the rest of the run.</summary>
    public static async Task<AppHostRun> EnsureRunningAsync()
    {
        if (_current is { _process.HasExited: false })
        {
            return _current;
        }

        _current = await StartAsync();
        Generation++;
        return _current;
    }

    /// <summary>Stops the running host (its containers go with it) and starts it again.</summary>
    public static async Task<AppHostRun> RestartAsync()
    {
        await StopCurrentAsync();
        return await EnsureRunningAsync();
    }

    public static async Task StopCurrentAsync()
    {
        if (_current is null)
        {
            return;
        }

        await _current.StopAsync();
        _current = null;
    }

    /// <summary>The Keycloak container the running host started.</summary>
    public string KeycloakContainerId()
    {
        var name = Manifest.Keycloak.Name;
        var ids = Cli.Run("docker", "ps", "--filter", $"name=^{name}-", "--format", "{{.ID}}")
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        ids.Length.ShouldBe(1, $"the running AppHost must run exactly one '{name}' container.");
        return ids[0];
    }

    private static async Task<AppHostRun> StartAsync()
    {
        var keycloak = Manifest.Keycloak;
        keycloak.HostPort("http").ShouldBe(KeycloakPort,
            $"the Keycloak resource '{keycloak.Name}' must publish its http endpoint on the fixed port {KeycloakPort}.");
        (await IsListeningAsync(KeycloakPort)).ShouldBeFalse(
            $"port {KeycloakPort} is already in use — stop the other AppHost (or whatever holds it) before this run.");

        var start = new ProcessStartInfo("dotnet")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            WorkingDirectory = AppHostManifest.AppHostDirectory
        };
        foreach (var argument in new[] { "run", "--project", AppHostManifest.AppHostProject })
        {
            start.ArgumentList.Add(argument);
        }

        var run = new AppHostRun(Process.Start(start)!);
        try
        {
            await run.WaitForRealmAsync();
        }
        catch
        {
            await run.StopAsync();
            throw;
        }

        return run;
    }

    private async Task WaitForRealmAsync()
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
        var discovery = $"{RealmIssuer}/.well-known/openid-configuration";
        var deadline = DateTime.UtcNow + StartTimeout;
        while (DateTime.UtcNow < deadline)
        {
            if (_process.HasExited)
            {
                Assert.Fail($"the AppHost exited ({_process.ExitCode}) before Keycloak served the demo realm:\n{Output}");
            }

            try
            {
                using var response = await http.GetAsync(discovery);
                if (response.IsSuccessStatusCode)
                {
                    return;
                }
            }
            catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
            {
                // Keycloak is not listening yet.
            }

            await Task.Delay(TimeSpan.FromSeconds(2));
        }

        Assert.Fail($"Keycloak did not serve the demo realm at {discovery} within {StartTimeout}:\n{Output}");
    }

    /// <summary>Ctrl-C, as a developer stops the host: the host removes the containers it started.</summary>
    private async Task StopAsync()
    {
        if (!_process.HasExited)
        {
            Cli.Run("kill", "-INT", _process.Id.ToString(System.Globalization.CultureInfo.InvariantCulture));
            using var timeout = new CancellationTokenSource(StopTimeout);
            try
            {
                await _process.WaitForExitAsync(timeout.Token);
            }
            catch (OperationCanceledException)
            {
                _process.Kill(entireProcessTree: true);
                await _process.WaitForExitAsync();
            }
        }

        var deadline = DateTime.UtcNow + StopTimeout;
        while (await IsListeningAsync(KeycloakPort) && DateTime.UtcNow < deadline)
        {
            await Task.Delay(TimeSpan.FromSeconds(1));
        }
    }

    private string Output
    {
        get
        {
            lock (_output)
            {
                return _output.ToString();
            }
        }
    }

    private void Append(string? line)
    {
        if (line is null)
        {
            return;
        }

        lock (_output)
        {
            _output.AppendLine(line);
        }
    }

    public static async Task<bool> IsListeningAsync(int port)
    {
        using var socket = new TcpClient();
        try
        {
            await socket.ConnectAsync("localhost", port).WaitAsync(TimeSpan.FromSeconds(2));
            return true;
        }
        catch (Exception e) when (e is SocketException or TimeoutException)
        {
            return false;
        }
    }
}

/// <summary>
/// The AppHost's Aspire manifest (<c>dotnet run -- --publisher manifest</c>): every resource with its image,
/// bindings and the environment it is given, as Aspire expressions (<c>{Keycloak.bindings.http.url}</c>,
/// <c>{SomeParameter.value}</c>).
/// </summary>
public sealed partial class AppHostManifest(JsonElement resources, string programSource)
{
    public static string AppHostDirectory => Path.Combine(Cli.RepoRoot(), "ApiEndpoints", "DKNet.Accounts.AppHost");

    public static string AppHostProject => Path.Combine(AppHostDirectory, "DKNet.Accounts.AppHost.csproj");

    /// <summary>Where DRK-1796 §3 row 2 keeps the demo realm — never under the ledger service or the console.</summary>
    public static string RealmsDirectory => Path.Combine(AppHostDirectory, "Realms");

    [GeneratedRegex(@"\{(?<resource>[^.{}]+)\.(?<path>[^{}]+)\}")]
    private static partial Regex Placeholder();

    public static AppHostManifest Publish()
    {
        var output = Path.Combine(Path.GetTempPath(), $"apphost-manifest-{Guid.NewGuid():N}", "aspire-manifest.json");
        try
        {
            Cli.Run("dotnet", "run", "--project", AppHostProject, "--", "--publisher", "manifest", "--output-path", output);
            using var document = JsonDocument.Parse(File.ReadAllText(output));
            return new AppHostManifest(document.RootElement.GetProperty("resources").Clone(),
                File.ReadAllText(Path.Combine(AppHostDirectory, "AppHost.cs")));
        }
        finally
        {
            Directory.Delete(Path.GetDirectoryName(output)!, recursive: true);
        }
    }

    /// <summary>The one Keycloak container resource the host starts.</summary>
    public ManifestResource Keycloak
    {
        get
        {
            var keycloak = resources.EnumerateObject()
                .Where(r => r.Value.TryGetProperty("image", out var image)
                            && image.GetString()!.Contains("keycloak", StringComparison.OrdinalIgnoreCase))
                .Select(r => new ManifestResource(r.Name, r.Value))
                .ToArray();
            keycloak.Length.ShouldBe(1, "the AppHost must start exactly one Keycloak container resource.");
            return keycloak[0];
        }
    }

    public ManifestResource Resource(string name)
    {
        resources.TryGetProperty(name, out var resource).ShouldBeTrue($"the AppHost has no '{name}' resource.");
        return new ManifestResource(name, resource);
    }

    /// <summary>
    /// A resource's environment as it runs on the developer's machine: the Keycloak endpoint is the fixed
    /// <see cref="AppHostRun.KeycloakBase"/>, a parameter is its default in <c>AppHost.cs</c>, and every other
    /// placeholder is looked up in <paramref name="substitutes"/> (e.g. the Api endpoint, replaced by the
    /// scenario's own ledger host). <paramref name="keys"/> picks the variables to read; an unresolvable placeholder
    /// in one of them fails the scenario by name.
    /// </summary>
    public Dictionary<string, string> Environment(string resourceName, Func<string, bool>? keys = null,
        IReadOnlyDictionary<string, string>? substitutes = null)
    {
        var resource = Resource(resourceName);
        var keycloak = Keycloak.Name;
        return resource.Environment.Where(e => keys?.Invoke(e.Key) ?? true).ToDictionary(e => e.Key, e => Placeholder().Replace(e.Value, match =>
        {
            if (substitutes is not null && substitutes.TryGetValue(match.Value, out var substitute))
            {
                return substitute;
            }

            var name = match.Groups["resource"].Value;
            var path = match.Groups["path"].Value;
            if (name == keycloak && path.StartsWith("bindings.http.", StringComparison.Ordinal))
            {
                return path["bindings.http.".Length..] switch
                {
                    "url" => AppHostRun.KeycloakBase.ToString().TrimEnd('/'),
                    "host" => AppHostRun.KeycloakBase.Host,
                    "port" => AppHostRun.KeycloakPort.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    _ => throw new AssertionException($"'{resourceName}' env {e.Key}: cannot resolve {match.Value}.")
                };
            }

            if (path == "value" && ParameterDefault(name) is { } value)
            {
                return value;
            }

            throw new AssertionException($"'{resourceName}' env {e.Key}: cannot resolve {match.Value}.");
        }));
    }

    /// <summary>The literal default a parameter is added with in <c>AppHost.cs</c> (Aspire's manifest leaves it out).</summary>
    public string? ParameterDefault(string parameter)
    {
        var match = Regex.Match(programSource,
            $@"AddParameter\(\s*""{Regex.Escape(parameter)}""\s*,\s*""(?<value>[^""]*)""");
        return match.Success ? match.Groups["value"].Value : null;
    }
}

public sealed record ManifestResource(string Name, JsonElement Json)
{
    public string Image => Json.GetProperty("image").GetString()!;

    public IReadOnlyDictionary<string, string> Environment =>
        Json.TryGetProperty("env", out var env)
            ? env.EnumerateObject().ToDictionary(e => e.Name, e => e.Value.GetString() ?? "")
            : new Dictionary<string, string>();

    public int? HostPort(string binding) =>
        Json.TryGetProperty("bindings", out var bindings)
        && bindings.TryGetProperty(binding, out var endpoint)
        && endpoint.TryGetProperty("port", out var port)
            ? port.GetInt32()
            : null;

    public bool Has(string property) =>
        Json.TryGetProperty(property, out var value) && value.ValueKind switch
        {
            JsonValueKind.Array => value.GetArrayLength() > 0,
            JsonValueKind.Object => value.EnumerateObject().Any(),
            _ => true
        };
}

internal static class Cli
{
    public static string Run(string fileName, params string[] arguments)
    {
        var start = new ProcessStartInfo(fileName) { RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var argument in arguments)
        {
            start.ArgumentList.Add(argument);
        }

        using var process = Process.Start(start)!;
        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();
        process.WaitForExit();
        process.ExitCode.ShouldBe(0, $"{fileName} {string.Join(' ', arguments)} failed:\n{output.Result}\n{error.Result}");
        return output.Result;
    }

    public static string RepoRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "docker-compose.yml")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName ?? throw new InvalidOperationException("docker-compose.yml not found above the test output.");
    }
}

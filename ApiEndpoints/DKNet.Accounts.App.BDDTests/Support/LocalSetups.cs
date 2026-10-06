using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// The docker compose local setup of DRK-1773 §3, read the way it starts the API: which RabbitMQ it starts, how
/// the API reaches it, and the settings the API ends up running with. The read asserts the setup's wiring and
/// returns the API's effective message-bus settings, so a scenario can start a host with exactly those settings
/// against the run's broker.
/// </summary>
public static partial class LocalSetups
{
    /// <summary>The official Docker Hub RabbitMQ image, published for both linux/amd64 and linux/arm64.</summary>
    [GeneratedRegex(@"^(docker\.io/)?(library/)?rabbitmq(:[A-Za-z0-9._-]+)?$")]
    private static partial Regex OfficialRabbitMqImage();

    /// <summary>The API's effective message-bus settings under one setup, keyed as configuration paths.</summary>
    public sealed record BusSettings(string? EnableServiceBus, string? Transport, string? OutboundQueue);

    /// <summary>Reads docker-compose.yml as compose resolves it, with <c>.env.sample</c> copied to <c>.env</c> as
    /// the README instructs.</summary>
    public static BusSettings DockerCompose()
    {
        var root = RepoRoot();
        using var config = JsonDocument.Parse(Run("docker", "compose", "-f", Path.Combine(root, "docker-compose.yml"),
            "--env-file", Path.Combine(root, ".env.sample"), "--profile", "api", "config", "--format", "json"));
        var services = config.RootElement.GetProperty("services");

        var rabbit = services.EnumerateObject()
            .Where(s => s.Value.TryGetProperty("image", out var image)
                        && image.GetString() is { } name && name.Contains("rabbitmq", StringComparison.OrdinalIgnoreCase))
            .ToArray();
        rabbit.Length.ShouldBe(1, "docker compose must start exactly one RabbitMQ service.");
        var rabbitName = rabbit[0].Name;
        var rabbitImage = rabbit[0].Value.GetProperty("image").GetString()!;
        OfficialRabbitMqImage().IsMatch(rabbitImage).ShouldBeTrue(
            $"compose service '{rabbitName}' runs '{rabbitImage}'; it must be the official multi-arch rabbitmq image.");
        rabbit[0].Value.TryGetProperty("healthcheck", out var healthcheck).ShouldBeTrue(
            $"compose service '{rabbitName}' needs a healthcheck so the API can wait until it is healthy.");
        healthcheck.TryGetProperty("test", out _).ShouldBeTrue($"compose service '{rabbitName}' healthcheck has no test.");

        var api = services.GetProperty("api");
        api.TryGetProperty("depends_on", out var dependsOn).ShouldBeTrue("compose service 'api' depends on nothing.");
        dependsOn.TryGetProperty(rabbitName, out var dependency).ShouldBeTrue(
            $"compose service 'api' must depend on '{rabbitName}'.");
        dependency.GetProperty("condition").GetString().ShouldBe("service_healthy");

        var environment = api.GetProperty("environment").EnumerateObject()
            .ToDictionary(e => e.Name, e => e.Value.GetString());
        environment.TryGetValue("ConnectionStrings__RabbitMq", out var connection).ShouldBeTrue(
            "compose service 'api' must be given ConnectionStrings__RabbitMq.");
        new Uri(connection!).Host.ShouldBe(rabbitName, "the API must reach RabbitMQ at its compose service name.");

        var effective = new ConfigurationBuilder()
            .AddJsonFile(ApiSettingsFile(root, "appsettings.json"))
            .AddInMemoryCollection(ReadEnvFile(Path.Combine(root, ".env.sample")))
            .AddInMemoryCollection(AsConfiguration(environment))
            .Build();
        return Read(effective);
    }

    private static BusSettings Read(IConfiguration configuration) => new(
        configuration["FeatureManagement:EnableServiceBus"],
        configuration["MessageBus:Transport"],
        configuration["MessageBus:OutboundQueue"]);

    private static string ApiSettingsFile(string root, string file) =>
        Path.Combine(root, "ApiEndpoints", "DKNet.Accounts.Api", file);

    private static Dictionary<string, string?> AsConfiguration(IReadOnlyDictionary<string, string?> environment) =>
        environment.ToDictionary(e => e.Key.Replace("__", ":", StringComparison.Ordinal), e => e.Value);

    private static Dictionary<string, string?> ReadEnvFile(string path) =>
        AsConfiguration(File.ReadAllLines(path)
            .Select(line => line.Trim())
            .Where(line => line.Length > 0 && !line.StartsWith('#') && line.Contains('='))
            .Select(line => line.Split('=', 2))
            .ToDictionary(pair => pair[0], pair => (string?)pair[1]));

    private static string RepoRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "docker-compose.yml")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName ?? throw new InvalidOperationException("docker-compose.yml not found above the test output.");
    }

    private static string Run(string fileName, params string[] arguments)
    {
        var start = new ProcessStartInfo(fileName)
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        foreach (var argument in arguments)
        {
            start.ArgumentList.Add(argument);
        }

        using var process = Process.Start(start)!;
        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();
        process.WaitForExit();
        process.ExitCode.ShouldBe(0, $"{fileName} {string.Join(' ', arguments)} failed: {error.Result}");
        return output.Result;
    }
}

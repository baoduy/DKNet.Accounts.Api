using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.SharedHosting;

/// <summary>
/// DRK-2365 (phase of DRK-2332 §5): the DKNet.Accounts.Api rows of the shared-hosting acceptance scenarios, plus
/// the §3 "Must stay true" items for this repo. Each nested class is named after its spec scenario; outline rows
/// are <c>[Theory]</c> rows holding the spec's literals.
/// </summary>
public sealed class SharedHostingAdoptionTests
{
    private const string ForwardedFor = "198.51.100.7";

    private static HttpRequestMessage FromPeer(string peer, string? forwardedFor = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/healthz");
        request.Headers.Add(RemoteIpTestStartupFilter.TestRemoteIpHeader, peer);
        if (forwardedFor is not null)
        {
            request.Headers.Add("X-Forwarded-For", forwardedFor);
        }

        return request;
    }

    private static string SeenClient(HttpResponseMessage response) =>
        response.Headers.GetValues(SeenClientEchoStartupFilter.SeenClientHeader).Single();

    /// <summary>
    /// Sends 101 requests from one peer: 10 parallel batches of 10 (under the shipped in-flight cap of 20, and
    /// fast enough to stay inside the shipped 1-second window), then the 101st on its own.
    /// </summary>
    private static async Task<HttpStatusCode[]> Send101RequestsFrom(HttpClient client, string peer)
    {
        var statuses = new List<HttpStatusCode>();
        for (var batch = 0; batch < 10; batch++)
        {
            var responses = await Task.WhenAll(Enumerable.Range(0, 10).Select(_ => client.SendAsync(FromPeer(peer))));
            statuses.AddRange(responses.Select(r => r.StatusCode));
        }

        statuses.Add((await client.SendAsync(FromPeer(peer))).StatusCode);
        return [.. statuses];
    }

    /// <summary>Scenario Outline: Each service trusts forwarded headers from its trusted network — DKNet.Accounts.Api rows.</summary>
    public sealed class EachServiceTrustsForwardedHeadersFromItsTrustedNetwork(TrustedNetworkApiFixture fixture)
        : IClassFixture<TrustedNetworkApiFixture>
    {
        [Theory]
        [InlineData("10.1.2.3", "198.51.100.7")]
        [InlineData("203.0.113.9", "203.0.113.9")]
        public async Task TheServiceSeesTheClientAs(string peer, string client)
        {
            using var request = FromPeer(peer, ForwardedFor);

            var response = await fixture.CreateClient().SendAsync(request);

            SeenClient(response).ShouldBe(client);
        }
    }

    /// <summary>Scenario Outline: Accounts.Api announces its shared items through its logger.</summary>
    /// <remarks>
    /// The logged line is DKNet 13.3.0's <c>"{Feature} enabled"</c> with <c>Feature = nameof(&lt;Config class&gt;)</c>
    /// (brief §2). The console logging provider is removed so a logger line can never reach the console; what the
    /// item adds to the console is measured against a baseline host with all six items off, because security
    /// headers, health checks and the other local items keep their own console lines (brief §4).
    /// </remarks>
    public sealed class AccountsApiAnnouncesItsSharedItemsThroughItsLogger
    {
        private static readonly Dictionary<string, string?> AllSixOff = new()
        {
            ["FeatureManagement__EnableRateLimit"] = "false",
            ["FeatureManagement__EnableAntiforgery"] = "false",
            ["FeatureManagement__EnableRequestBounds"] = "false",
            ["FeatureManagement__EnableHttps"] = "false",
            ["FeatureManagement__EnableForwardedHeaders"] = "false",
            ["Cors__AllowedOrigins__0"] = null
        };

        [Theory]
        [InlineData("rate limiting", "FeatureManagement__EnableRateLimit", "true", "RateLimitConfig enabled")]
        [InlineData("antiforgery", "FeatureManagement__EnableAntiforgery", "true", "AntiforgeryConfig enabled")]
        [InlineData("request bounds", "FeatureManagement__EnableRequestBounds", "true", "RequestBoundsConfig enabled")]
        [InlineData("HTTPS", "FeatureManagement__EnableHttps", "true", "HttpsConfig enabled")]
        [InlineData("forwarded headers", "FeatureManagement__EnableForwardedHeaders", "true", "ForwardedHeadersConfig enabled")]
        [InlineData("CORS", "Cors__AllowedOrigins__0", "https://app.example.com", "CorsConfig enabled")]
        public async Task ItsLoggerRecordsTheItemAndNothingIsWrittenToTheConsole(
            string item, string switchKey, string switchValue, string enabledLine)
        {
            var (baselineConsole, _) = await StartHost(AllSixOff);
            var itemOn = new Dictionary<string, string?>(AllSixOff) { [switchKey] = switchValue };

            var (itemConsole, itemLog) = await StartHost(itemOn);

            itemLog.ShouldSatisfyAllConditions(
                () => itemLog.Count(line => line == enabledLine).ShouldBe(1,
                    $"with {item} on, the host's logger must record \"{enabledLine}\" exactly once."),
                () => itemConsole.Except(baselineConsole).ShouldBeEmpty(
                    $"turning {item} on must write nothing to the console."));
        }

        private static async Task<(string[] Console, string[] Log)> StartHost(IReadOnlyDictionary<string, string?> settings)
        {
            await using var host = new LoggerOnlyFactory();
            var console = new StringWriter(new StringBuilder());
            var previousOut = System.Console.Out;
            using (new EnvironmentOverride(settings))
            {
                System.Console.SetOut(console);
                try
                {
                    _ = host.CreateClient();
                }
                finally
                {
                    System.Console.SetOut(previousOut);
                }
            }

            var lines = console.ToString().Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
            return (lines, [.. host.LogCapture.Messages]);
        }

        private sealed class LoggerOnlyFactory : TestApiFactoryBase
        {
            protected override void ConfigureWebHost(IWebHostBuilder builder)
            {
                base.ConfigureWebHost(builder);
                builder.ConfigureLogging(logging => logging.ClearProviders().AddProvider(LogCapture));
            }
        }
    }

    /// <summary>
    /// Must stay true: "rate limiting never lets a caller pick its bucket with the host name" — spec scenario
    /// "Requests with no client address share one bucket" for DKNet.Accounts.Api. TestServer leaves
    /// <c>RemoteIpAddress</c> empty when no <see cref="RemoteIpTestStartupFilter.TestRemoteIpHeader" /> is sent.
    /// </summary>
    public sealed class RequestsWithNoClientAddressShareOneBucket(TwoPerSecondRateLimitApiFixture fixture)
        : IClassFixture<TwoPerSecondRateLimitApiFixture>
    {
        [Fact]
        public async Task TheThirdRequestForAnotherHostNameGets429()
        {
            var first = await SendFor("a.example");
            var second = await SendFor("b.example");

            var third = await SendFor("c.example");

            first.ShouldBe(HttpStatusCode.OK);
            second.ShouldBe(HttpStatusCode.OK);
            third.ShouldBe(HttpStatusCode.TooManyRequests,
                "requests with no client address share one bucket whatever host name they send.");
        }

        private async Task<HttpStatusCode> SendFor(string hostName)
        {
            var client = fixture.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri($"http://{hostName}")
            });
            return (await client.GetAsync("/healthz")).StatusCode;
        }
    }

    /// <summary>
    /// Scenario Outline: Each service keeps its shipped rate limit — DKNet.Accounts.Api row. Accounts.Api runs
    /// rate limiting before authentication (brief §4), so a caller is counted by its address, never its user
    /// name: "treasury-ops" is one caller at one peer address here.
    /// </summary>
    public sealed class EachServiceKeepsItsShippedRateLimit(ShippedRateLimitApiFixture fixture)
        : IClassFixture<ShippedRateLimitApiFixture>
    {
        [Fact]
        public async Task TheLastOf101RequestsWithinOneSecondIsRefusedWith429()
        {
            var statuses = await Send101RequestsFrom(fixture.CreateClient(), "203.0.113.77");

            statuses[^1].ShouldBe(HttpStatusCode.TooManyRequests);
        }
    }

    /// <summary>
    /// Scenario Outline: An item switched off by its feature flag changes nothing — DKNet.Accounts.Api rows for
    /// HTTPS, rate limiting and forwarded headers. The request-bounds row runs on a real Kestrel process below.
    /// </summary>
    public sealed class AnItemSwitchedOffByItsFeatureFlagChangesNothing(FeaturesSwitchedOffApiFixture fixture)
        : IClassFixture<FeaturesSwitchedOffApiFixture>
    {
        [Fact]
        public async Task Https_APlainHttpRequestIsNotRedirectedAndGetsNoHstsHeader()
        {
            var response = await PlainHttpClient(fixture).GetAsync("/healthz");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            response.Headers.Location.ShouldBeNull();
            response.Headers.Contains("Strict-Transport-Security").ShouldBeFalse();
        }

        [Fact]
        public async Task RateLimiting_NoneOf101RequestsWithinOneSecondIsRefusedWith429()
        {
            var statuses = await Send101RequestsFrom(fixture.CreateClient(), "203.0.113.78");

            statuses.ShouldNotContain(HttpStatusCode.TooManyRequests);
        }

        [Fact]
        public async Task ForwardedHeaders_TheServiceSeesTheClientAsThePeerInTheTrustedNetwork()
        {
            using var request = FromPeer("10.1.2.3", ForwardedFor);

            var response = await fixture.CreateClient().SendAsync(request);

            SeenClient(response).ShouldBe("10.1.2.3");
        }

        internal static HttpClient PlainHttpClient(WebApplicationFactory<DKNet.Accounts.Api.Program> factory) =>
            factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("http://api.example.com"),
                AllowAutoRedirect = false
            });
    }

    /// <summary>Presence sibling of the HTTPS-off row: the same plain HTTP request IS redirected with HTTPS on.</summary>
    public sealed class WithHttpsOn(HttpsOnApiFixture fixture) : IClassFixture<HttpsOnApiFixture>
    {
        [Fact]
        public async Task APlainHttpRequestIsRedirectedToHttps()
        {
            var response = await AnItemSwitchedOffByItsFeatureFlagChangesNothing.PlainHttpClient(fixture)
                .GetAsync("/healthz");

            response.Headers.Location.ShouldBe(new Uri("https://api.example.com/healthz"));
        }
    }

    /// <summary>
    /// Scenario Outline: An item switched off by its feature flag changes nothing — DKNet.Accounts.Api request-bounds
    /// row. The body maximum is a Kestrel limit TestServer never enforces, so this runs the real process; its
    /// presence sibling is <c>RequestBoundsTests.OversizedRequestBody_IsRefused</c> (413 with the flag on).
    /// </summary>
    public sealed class RequestBoundsSwitchedOffChangesNothing(RequestBoundsOffRealProcessApiFixture fixture)
        : IClassFixture<RequestBoundsOffRealProcessApiFixture>
    {
        [Fact]
        public async Task A2MiBBodyIsNotRefusedForItsSize()
        {
            var body = "{\"description\":\"" + new string('a', 2 * 1024 * 1024) + "\"}";
            using var content = new StringContent(body, Encoding.UTF8, "application/json");

            var response = await fixture.RealClient.PostAsync("/v1/postings", content);

            response.StatusCode.ShouldNotBe(HttpStatusCode.RequestEntityTooLarge);
        }
    }

    /// <summary>Scenario Outline: Antiforgery stays off in each service — DKNet.Accounts.Api row, shipped settings.</summary>
    public sealed class AntiforgeryStaysOff(ApiFixture fixture) : IClassFixture<ApiFixture>
    {
        [Fact]
        public async Task AGetSetsNoXsrfTokenCookie()
        {
            var response = await fixture.CreateClient().GetAsync("/healthz");

            var cookies = response.Headers.TryGetValues("Set-Cookie", out var values) ? values : [];
            cookies.ShouldNotContain(c => c.StartsWith("XSRF-TOKEN=", StringComparison.Ordinal));
        }
    }
}

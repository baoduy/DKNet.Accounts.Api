using System.Net;
using System.Text;
using DKNet.Accounts.Infra.Services;
using DKNet.Accounts.Share.Options;
using Microsoft.Extensions.Options;

namespace DKNet.Accounts.App.Tests.Unit.Services;

/// <summary>
/// DRK-2156 §3 row 6 and R7: the onboarding email's client-credentials token — fetched from
/// <c>OnboardingEmail:TokenUrl</c>, reused until a minute before it expires, sent as a bearer token, and never
/// written into an exception message.
/// </summary>
public sealed class NotificationTokenHandlerTests
{
    private const string TokenUrl = "http://keycloak.test/realms/dknet/protocol/openid-connect/token";
    private const string Secret = "onboarding-secret-value";

    private readonly ScriptedHandler _token = new();
    private readonly ScriptedHandler _notification = new();

    [Fact]
    public async Task EveryCall_CarriesTheClientCredentialsToken_AsABearer()
    {
        _token.Answer = _ => Json("""{"access_token":"tok-1","expires_in":300}""");

        using var client = Client(Options());
        await client.PostAsync("http://notification.test/v1/notifications", null);

        var tokenRequest = _token.Requests.ShouldHaveSingleItem();
        tokenRequest.Uri.ShouldBe(new Uri(TokenUrl));
        tokenRequest.Body.ShouldBe(
            "grant_type=client_credentials&client_id=accounts-onboarding-email&client_secret=onboarding-secret-value");
        _notification.Requests.ShouldHaveSingleItem().Authorization.ShouldBe("Bearer tok-1");
    }

    [Fact]
    public async Task AToken_IsReusedUntilAMinuteBeforeItExpires()
    {
        var issued = 0;
        _token.Answer = _ => Json($$"""{"access_token":"tok-{{++issued}}","expires_in":300}""");

        using var client = Client(Options());
        await client.PostAsync("http://notification.test/v1/notifications", null);
        await client.PostAsync("http://notification.test/v1/notifications", null);

        _token.Requests.Count.ShouldBe(1);
        _notification.Requests.Select(r => r.Authorization).ShouldBe(["Bearer tok-1", "Bearer tok-1"]);
    }

    [Fact]
    public async Task ATokenThatLivesAMinuteOrLess_IsFetchedAgainOnTheNextCall()
    {
        var issued = 0;
        _token.Answer = _ => Json($$"""{"access_token":"tok-{{++issued}}","expires_in":60}""");

        using var client = Client(Options());
        await client.PostAsync("http://notification.test/v1/notifications", null);
        await client.PostAsync("http://notification.test/v1/notifications", null);

        _token.Requests.Count.ShouldBe(2);
        _notification.Requests.Select(r => r.Authorization).ShouldBe(["Bearer tok-1", "Bearer tok-2"]);
    }

    /// <summary>D10: a refused token request fails the call without the secret in the message.</summary>
    [Fact]
    public async Task ARefusedTokenRequest_FailsTheCall_WithoutTheSecretInTheMessage()
    {
        _token.Answer = _ => new HttpResponseMessage(HttpStatusCode.Unauthorized);

        using var client = Client(Options());
        var thrown = await Should.ThrowAsync<HttpRequestException>(
            () => client.PostAsync("http://notification.test/v1/notifications", null));

        thrown.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        thrown.Message.ShouldNotContain(Secret);
        _notification.Requests.ShouldBeEmpty();
    }

    [Theory]
    [InlineData(nameof(OnboardingEmailOptions.TokenUrl))]
    [InlineData(nameof(OnboardingEmailOptions.ClientId))]
    [InlineData(nameof(OnboardingEmailOptions.ClientSecret))]
    public async Task AMissingSetting_FailsTheCall_NamingTheKey(string missing)
    {
        var options = Options();
        typeof(OnboardingEmailOptions).GetProperty(missing)!.SetValue(options, null);

        using var client = Client(options);
        var thrown = await Should.ThrowAsync<InvalidOperationException>(
            () => client.PostAsync("http://notification.test/v1/notifications", null));

        thrown.Message.ShouldBe($"OnboardingEmail:{missing} is not set.");
        _token.Requests.ShouldBeEmpty();
    }

    private static OnboardingEmailOptions Options() => new()
    {
        NotificationBaseUrl = new Uri("http://notification.test"),
        TokenUrl = new Uri(TokenUrl),
        ClientId = "accounts-onboarding-email",
        ClientSecret = Secret
    };

    private HttpClient Client(OnboardingEmailOptions options) =>
        new(new NotificationTokenHandler(new TokenClientFactory(_token), Microsoft.Extensions.Options.Options.Create(options))
        {
            InnerHandler = _notification
        });

    private static HttpResponseMessage Json(string body) =>
        new(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    private sealed record Seen(Uri? Uri, string? Authorization, string Body);

    /// <summary>Answers every request it is sent with <see cref="Answer"/>, and records it.</summary>
    private sealed class ScriptedHandler : HttpMessageHandler
    {
        public List<Seen> Requests { get; } = [];

        public Func<HttpRequestMessage, HttpResponseMessage> Answer { get; set; } =
            _ => new HttpResponseMessage(HttpStatusCode.Accepted);

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
            Requests.Add(new Seen(request.RequestUri, request.Headers.Authorization?.ToString(), body));
            return Answer(request);
        }
    }

    private sealed class TokenClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }
}

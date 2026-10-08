using System.Collections.Concurrent;
using Microsoft.Extensions.Http;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>One <c>POST /v1/notifications</c> the service sent, exactly as it left.</summary>
public sealed record NotificationRequest(string? IdempotencyKey, string? Authorization, string Body)
{
    /// <summary>The request body's <c>parameters</c> entry, or null when it has none.</summary>
    public string? Parameter(string name)
    {
        using var doc = JsonDocument.Parse(Body);
        return doc.RootElement.TryGetProperty("parameters", out var parameters)
               && parameters.TryGetProperty(name, out var value)
            ? value.GetString()
            : null;
    }

    public override string ToString() => $"Idempotency-Key {IdempotencyKey}: {Body}";
}

/// <summary>
/// DKNet Notification and the realm's token endpoint, faked at the primary HTTP handler of every
/// <see cref="HttpClient"/> the host creates (DRK-2156 §5 HTTP seam). Every notification request is recorded,
/// failed ones included; a repeated idempotency key gets the first notification id back, the way the real
/// service replays it.
/// </summary>
public sealed class FakeNotificationService : HttpMessageHandler
{
    public const string BaseUrl = "http://notification.test";
    public const string TokenUrl = "http://keycloak.test/realms/dknet-accounts/protocol/openid-connect/token";
    public const string AccessToken = "fake-access-token-7f3a";
    public const string ClientSecret = "fake-client-secret-91c2";

    private readonly ConcurrentQueue<NotificationRequest> _requests = new();
    private readonly ConcurrentDictionary<string, Guid> _replays = new(StringComparer.Ordinal);

    public enum Failure
    {
        None,
        Unreachable,
        Forbidden
    }

    /// <summary>How the notification endpoint answers. The token endpoint always issues a token.</summary>
    public Failure Mode { get; set; }

    /// <summary>Every notification request received so far, in arrival order.</summary>
    public IReadOnlyList<NotificationRequest> Requests => _requests.ToArray();

    /// <summary>
    /// Makes this fake the primary handler of every HttpClient the host creates. Set after every other handler
    /// builder action, because the Notification client's own registration sets a primary handler of its own, which
    /// <c>ConfigureHttpClientDefaults</c> alone would not override.
    /// </summary>
    public void Register(IServiceCollection services) =>
        services.PostConfigureAll<HttpClientFactoryOptions>(o =>
            o.HttpMessageHandlerBuilderActions.Add(b => b.PrimaryHandler = this));

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        if (request.RequestUri == new Uri(TokenUrl))
        {
            return Json(HttpStatusCode.OK, $$"""{"access_token":"{{AccessToken}}","expires_in":300}""");
        }

        var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
        var key = request.Headers.TryGetValues("Idempotency-Key", out var keys) ? keys.Single() : null;
        _requests.Enqueue(new NotificationRequest(key, request.Headers.Authorization?.ToString(), body));

        return Mode switch
        {
            Failure.Unreachable => throw new HttpRequestException("Connection refused (notification.test:80)"),
            Failure.Forbidden => new HttpResponseMessage(HttpStatusCode.Forbidden),
            _ => Json(HttpStatusCode.Accepted,
                $$"""{"notificationId":"{{_replays.GetOrAdd(key ?? "", _ => Guid.NewGuid())}}"}""")
        };
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string body) =>
        new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    // Shared by every HttpClient of the host: the factory's handler rotation must not dispose it.
    protected override void Dispose(bool disposing)
    {
    }
}

using System.Net.Http.Headers;
using System.Text.Json;
using DKNet.Accounts.Share.Options;
using Microsoft.Extensions.Options;

namespace DKNet.Accounts.Infra.Services;

/// <summary>
///     Signs every DKNet Notification call in as the onboarding email's own service client (DRK-2156): fetches a
///     client-credentials token from <see cref="OnboardingEmailOptions.TokenUrl" /> with
///     <see cref="OnboardingEmailOptions.ClientId" />/<see cref="OnboardingEmailOptions.ClientSecret" />, and reuses
///     it until shortly before it expires. Mirrors TrafficGen's <c>ClientCredentialsHandler</c>. The token request
///     goes through <see cref="IHttpClientFactory" />, and nothing here logs the token or the secret (R7).
/// </summary>
internal sealed class NotificationTokenHandler(
    IHttpClientFactory httpClientFactory,
    IOptions<OnboardingEmailOptions> options,
    TimeProvider clock) : DelegatingHandler
{
    // Only one caller fetches a new token; the others wait for it.
    private readonly SemaphoreSlim _lock = new(1, 1);
    private string? _token;
    private DateTimeOffset _renewAt;

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await GetTokenAsync(cancellationToken));
        return await base.SendAsync(request, cancellationToken);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _lock.Dispose();
        base.Dispose(disposing);
    }

    private async Task<string> GetTokenAsync(CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (_token is not null && clock.GetUtcNow() < _renewAt) return _token;

            var settings = options.Value;
            var tokenUrl = settings.TokenUrl ?? throw NotSet(nameof(settings.TokenUrl));
            using var form = new FormUrlEncodedContent(new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = Setting(settings.ClientId, nameof(settings.ClientId)),
                ["client_secret"] = Setting(settings.ClientSecret, nameof(settings.ClientSecret))
            });

            using var http = httpClientFactory.CreateClient();
            using var response = await http.PostAsync(tokenUrl, form, ct);
            response.EnsureSuccessStatusCode();
            using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct),
                cancellationToken: ct);
            _token = body.RootElement.GetProperty("access_token").GetString()!;
            // Renewed a minute early, so no call goes out with a token that lapses in flight.
            _renewAt = clock.GetUtcNow().AddSeconds(body.RootElement.GetProperty("expires_in").GetInt32() - 60);
            return _token;
        }
        finally
        {
            _lock.Release();
        }
    }

    private static string Setting(string? value, string key) =>
        string.IsNullOrWhiteSpace(value) ? throw NotSet(key) : value;

    // Names the key only, never its value.
    private static InvalidOperationException NotSet(string key) =>
        new($"{OnboardingEmailOptions.Name}:{key} is not set.");
}

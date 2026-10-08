using System.Net.Http.Headers;
using System.Text.Json;

namespace DKNet.Accounts.EmailProcessor;

/// <summary>Signs every Accounts API and DKNet Notification call in as the email processor's own machine client:
/// fetches a client-credentials token from <c>Auth:TokenUrl</c> (the AppHost's demo Keycloak) with
/// <c>Auth:ClientId</c>/<c>Auth:ClientSecret</c>, and reuses it until shortly before it expires. One token serves both
/// services, as the client's token carries both audiences. Nothing here logs the token or the secret (R6).</summary>
internal sealed class ClientCredentialsHandler(IHttpClientFactory httpClientFactory, IConfiguration config)
    : DelegatingHandler
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
            if (_token is not null && DateTimeOffset.UtcNow < _renewAt) return _token;

            // Program checks these settings at start, so none is missing here.
            using var form = new FormUrlEncodedContent(new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = config["Auth:ClientId"]!,
                ["client_secret"] = config["Auth:ClientSecret"]!
            });
            using var http = httpClientFactory.CreateClient();
            using var response = await http.PostAsync(config["Auth:TokenUrl"], form, ct);
            response.EnsureSuccessStatusCode();
            using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct),
                cancellationToken: ct);
            _token = body.RootElement.GetProperty("access_token").GetString()!;
            // Renewed a minute early, so no call goes out with a token that lapses in flight.
            _renewAt = DateTimeOffset.UtcNow.AddSeconds(body.RootElement.GetProperty("expires_in").GetInt32() - 60);
            return _token;
        }
        finally
        {
            _lock.Release();
        }
    }
}

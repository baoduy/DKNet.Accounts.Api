using System.Net.Http.Headers;
using System.Text.Json;

namespace DKNet.Accounts.TrafficGen;

/// <summary>Signs every ledger call in as TrafficGen's own machine client: fetches a client-credentials token from
/// <c>Auth:TokenUrl</c> (the AppHost's demo Keycloak) with <c>Auth:ClientId</c>/<c>Auth:ClientSecret</c>, and reuses
/// it until shortly before it expires. Chained onto <see cref="DKNet.Accounts.Client.IAccountClient"/>, so its
/// <see cref="DelegatingHandler.InnerHandler"/> stays null.</summary>
internal sealed class ClientCredentialsHandler(IHttpClientFactory httpClientFactory, IConfiguration config)
    : DelegatingHandler
{
    // The worker's account pairs call the ledger side by side; only one of them fetches a new token.
    private readonly SemaphoreSlim _lock = new(1, 1);
    private string? _token;
    private DateTimeOffset _renewAt;

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await GetTokenAsync(cancellationToken));
        return await base.SendAsync(request, cancellationToken);
    }

    private async Task<string> GetTokenAsync(CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (_token is not null && DateTimeOffset.UtcNow < _renewAt) return _token;

            using var http = httpClientFactory.CreateClient();
            using var response = await http.PostAsync(Setting("Auth:TokenUrl"), new FormUrlEncodedContent(
                new Dictionary<string, string>
                {
                    ["grant_type"] = "client_credentials",
                    ["client_id"] = Setting("Auth:ClientId"),
                    ["client_secret"] = Setting("Auth:ClientSecret"),
                }), ct);
            response.EnsureSuccessStatusCode();
            using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
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

    private string Setting(string key) =>
        config[key] ?? throw new InvalidOperationException($"{key} is not set — run TrafficGen from the AppHost.");
}

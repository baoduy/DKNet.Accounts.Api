using System.Net.Http.Json;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// Sends a request as the scenario's current caller (<see cref="ScenarioState.CallerClientId"/> /
/// <see cref="ScenarioState.CallerScopes"/>) via <see cref="LedgerCallerAuthHandler"/>'s headers. Headers are
/// set per-request rather than on the shared <see cref="HttpClient"/> so one scenario's caller never bleeds
/// into the next.
/// </summary>
internal static class LedgerHttpClientExtensions
{
    public static Task<HttpResponseMessage> SendAsCallerAsync(
        this HttpClient client,
        ScenarioState state,
        HttpMethod method,
        string requestUri,
        object? body = null,
        string? idempotencyKey = null) =>
        SendAsAsync(client, state.CallerClientId, state.CallerScopes, method, requestUri, body, idempotencyKey);

    public static Task<HttpResponseMessage> SendUnauthenticatedAsync(
        this HttpClient client,
        HttpMethod method,
        string requestUri) =>
        client.SendAsync(new HttpRequestMessage(method, requestUri));

    private static async Task<HttpResponseMessage> SendAsAsync(
        HttpClient client,
        string clientId,
        string[] scopes,
        HttpMethod method,
        string requestUri,
        object? body,
        string? idempotencyKey)
    {
        using var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, clientId);
        request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', scopes));
        if (idempotencyKey is not null)
        {
            request.Headers.Add("Idempotency-Key", idempotencyKey);
        }

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        var response = await client.SendAsync(request);

        // Buffers the body into memory so more than one Then step can read it (e.g. the reference-data
        // scenario's two assertions each call ReadFromJsonAsync on the same captured response) — the network
        // stream can only be read once and throws ObjectDisposedException on a second read otherwise.
        await response.Content.LoadIntoBufferAsync();
        return response;
    }
}

using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.Client;

/// <summary>
/// Default <see cref="IAccountClient"/> implementation. Takes an already-configured <see cref="HttpClient"/>
/// (typically resolved from the typed-client registration <see cref="ServiceCollectionExtensions.AddAccountClient(Microsoft.Extensions.DependencyInjection.IServiceCollection, Uri)"/>
/// wires up) — this constructor is also the integration-test seam: a caller can build one directly around
/// any <see cref="HttpClient"/>, including a <c>WebApplicationFactory</c>'s in-memory one (spec's test
/// seam note). Never obtains, stores, or logs a credential of its own (R3) — every request the underlying
/// <see cref="HttpClient"/> sends carries only whatever <see cref="DelegatingHandler"/> the caller supplied.
/// </summary>
public sealed class AccountClient(HttpClient httpClient) : IAccountClient
{
    private const string Version = "v1";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    // ---- Account groups (10) ----

    public Task<AccountGroupDto> CreateAccountGroupAsync(CreateAccountGroupRequest request, CancellationToken ct = default) =>
        SendAsync<AccountGroupDto>(HttpMethod.Post, $"/{Version}/account-groups", request, ct: ct);

    public Task<PagedResult<AccountGroupDto>> GetAccountGroupsAsync(AccountGroupsListQuery? query = null, CancellationToken ct = default) =>
        SendAsync<PagedResult<AccountGroupDto>>(HttpMethod.Get, WithListQuery($"/{Version}/account-groups", query), ct: ct);

    public Task<AccountGroupDto> GetAccountGroupAsync(Guid id, CancellationToken ct = default) =>
        SendAsync<AccountGroupDto>(HttpMethod.Get, $"/{Version}/account-groups/{id}", ct: ct);

    public Task<AccountGroupDto> UpdateAccountGroupAsync(
        Guid id,
        string? name = null,
        string? description = null,
        IReadOnlyDictionary<string, string>? metadata = null,
        CancellationToken ct = default) =>
        SendAsync<AccountGroupDto>(
            HttpMethod.Put, $"/{Version}/account-groups/{id}", new { name, description, metadata }, ct: ct);

    public Task<AccountGroupDto> CloseAccountGroupAsync(Guid id, CancellationToken ct = default) =>
        SendAsync<AccountGroupDto>(HttpMethod.Post, $"/{Version}/account-groups/{id}/close", ct: ct);

    public Task<AccountGroupDto> ActivateAccountGroupAsync(Guid id, CancellationToken ct = default) =>
        SendAsync<AccountGroupDto>(HttpMethod.Post, $"/{Version}/account-groups/{id}/activate", ct: ct);

    public Task DeleteAccountGroupAsync(Guid id, CancellationToken ct = default) =>
        SendAsync(HttpMethod.Delete, $"/{Version}/account-groups/{id}", ct: ct);

    public Task<IReadOnlyList<AccountGroupBalanceLineDto>> GetAccountGroupBalancesAsync(Guid id, CancellationToken ct = default) =>
        SendAsync<IReadOnlyList<AccountGroupBalanceLineDto>>(HttpMethod.Get, $"/{Version}/account-groups/{id}/balances", ct: ct);

    public Task<IReadOnlyList<StatusCountDto>> GetAccountGroupStatusCountsAsync(
        DateTimeOffset? from = null, DateTimeOffset? toDate = null, CancellationToken ct = default) =>
        SendAsync<IReadOnlyList<StatusCountDto>>(
            HttpMethod.Get, WithStatusCountsQuery($"/{Version}/account-groups/status-counts", from, toDate), ct: ct);

    // ---- Accounts (8) ----

    public Task<AccountDto> OpenAccountAsync(OpenAccountRequest request, CancellationToken ct = default) =>
        SendAsync<AccountDto>(HttpMethod.Post, $"/{Version}/accounts", request, ct: ct);

    public Task<PagedResult<AccountDto>> GetAccountsAsync(AccountsListQuery? query = null, CancellationToken ct = default) =>
        SendAsync<PagedResult<AccountDto>>(HttpMethod.Get, WithListQuery($"/{Version}/accounts", query), ct: ct);

    public Task<AccountDto> GetAccountAsync(Guid id, CancellationToken ct = default) =>
        SendAsync<AccountDto>(HttpMethod.Get, $"/{Version}/accounts/{id}", ct: ct);

    public Task<AccountBalanceDto> GetAccountBalanceAsync(Guid id, CancellationToken ct = default) =>
        SendAsync<AccountBalanceDto>(HttpMethod.Get, $"/{Version}/accounts/{id}/balance", ct: ct);

    public Task<AccountDto> ChangeAccountDetailsAsync(
        Guid id,
        string? name = null,
        IReadOnlyDictionary<string, string>? metadata = null,
        CancellationToken ct = default) =>
        SendAsync<AccountDto>(HttpMethod.Put, $"/{Version}/accounts/{id}", new { name, metadata }, ct: ct);

    public Task<AccountDto> UpdateAccountAsync(
        Guid id, AccountStatus? status, decimal? overdraftLimit, decimal? minimumBalance, CancellationToken ct = default) =>
        SendAsync<AccountDto>(
            HttpMethod.Patch, $"/{Version}/accounts/{id}",
            new { status, overdraftLimit, minimumBalance }, ct: ct);

    public Task<PagedResult<PostingDto>> GetAccountStatementAsync(Guid id, StatementQuery? query = null, CancellationToken ct = default) =>
        SendAsync<PagedResult<PostingDto>>(HttpMethod.Get, WithStatementQuery($"/{Version}/accounts/{id}/statement", query), ct: ct);

    public Task<IReadOnlyList<StatusCountDto>> GetAccountStatusCountsAsync(
        DateTimeOffset? from = null, DateTimeOffset? toDate = null, CancellationToken ct = default) =>
        SendAsync<IReadOnlyList<StatusCountDto>>(
            HttpMethod.Get, WithStatusCountsQuery($"/{Version}/accounts/status-counts", from, toDate), ct: ct);

    public Task<IReadOnlyList<LedgerBalanceLineDto>> GetLedgerBalancesAsync(CancellationToken ct = default) =>
        SendAsync<IReadOnlyList<LedgerBalanceLineDto>>(HttpMethod.Get, $"/{Version}/accounts/balances", ct: ct);

    // ---- Currencies (6) ----

    public Task<PagedResult<CurrencyDto>> GetCurrenciesAsync(CurrenciesListQuery? query = null, CancellationToken ct = default) =>
        SendAsync<PagedResult<CurrencyDto>>(HttpMethod.Get, WithListQuery($"/{Version}/currencies", query), ct: ct);

    public Task<CurrencyDto> GetCurrencyAsync(Guid id, CancellationToken ct = default) =>
        SendAsync<CurrencyDto>(HttpMethod.Get, $"/{Version}/currencies/{id}", ct: ct);

    public Task<CurrencyDto> CreateCurrencyAsync(CreateCurrencyRequest request, CancellationToken ct = default) =>
        SendAsync<CurrencyDto>(HttpMethod.Post, $"/{Version}/currencies", request, ct: ct);

    public Task<CurrencyDto> RenameCurrencyAsync(Guid id, string name, CancellationToken ct = default) =>
        SendAsync<CurrencyDto>(HttpMethod.Put, $"/{Version}/currencies/{id}", new { name }, ct: ct);

    public Task<CurrencyDto> ActivateCurrencyAsync(Guid id, CancellationToken ct = default) =>
        SendAsync<CurrencyDto>(HttpMethod.Post, $"/{Version}/currencies/{id}/activate", ct: ct);

    public Task<CurrencyDto> DeactivateCurrencyAsync(Guid id, CancellationToken ct = default) =>
        SendAsync<CurrencyDto>(HttpMethod.Post, $"/{Version}/currencies/{id}/deactivate", ct: ct);

    // ---- Postings (5) ----

    public Task<PagedResult<PostingDto>> ListPostingsAsync(PostingsListQuery? query = null, CancellationToken ct = default) =>
        SendAsync<PagedResult<PostingDto>>(HttpMethod.Get, WithPostingsListQuery($"/{Version}/postings", query), ct: ct);

    public Task<PostingDto> RecordPostingAsync(RecordPostingRequest request, string idempotencyKey, CancellationToken ct = default) =>
        SendAsync<PostingDto>(HttpMethod.Post, $"/{Version}/postings", request, idempotencyKey, ct);

    public Task<IReadOnlyList<PostingDto>> RecordPostingBatchAsync(
        RecordPostingBatchRequest request, string idempotencyKey, CancellationToken ct = default) =>
        SendAsync<IReadOnlyList<PostingDto>>(HttpMethod.Post, $"/{Version}/postings/batch", request, idempotencyKey, ct);

    public Task<PostingDto> GetPostingAsync(Guid id, CancellationToken ct = default) =>
        SendAsync<PostingDto>(HttpMethod.Get, $"/{Version}/postings/{id}", ct: ct);

    // An anonymous body carrying only the reason, deliberately: posting ReversePostingRequest itself would
    // also serialize id and idempotencyKey as body fields, and a body-borne idempotencyKey is precisely what
    // the service refuses to trust (R3).
    public Task<PostingDto> ReversePostingAsync(
        Guid id, string reason, string idempotencyKey, CancellationToken ct = default) =>
        SendAsync<PostingDto>(
            HttpMethod.Post, $"/{Version}/postings/{id}/reverse", new { reason }, idempotencyKey, ct);

    // ---- Wire plumbing ----

    private async Task<TResponse> SendAsync<TResponse>(
        HttpMethod method, string path, object? body = null, string? idempotencyKey = null, CancellationToken ct = default)
    {
        using var response = await SendCoreAsync(method, path, body, idempotencyKey, ct).ConfigureAwait(false);
        var result = await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, ct).ConfigureAwait(false);
        return result!;
    }

    private async Task SendAsync(
        HttpMethod method, string path, object? body = null, string? idempotencyKey = null, CancellationToken ct = default)
    {
        using var response = await SendCoreAsync(method, path, body, idempotencyKey, ct).ConfigureAwait(false);
    }

    // Returns ownership of the request to the caller, who does not dispose it either: HttpRequestMessage/
    // JsonContent here wrap only managed byte buffers (no unmanaged handle), and a caller-supplied
    // DelegatingHandler (e.g. a test double) legitimately keeps a reference to the request — including its
    // Content — to inspect after the call completes, which disposing it would pull out from under.
    private static HttpRequestMessage CreateRequest(HttpMethod method, string path, object? body, string? idempotencyKey)
    {
        var request = new HttpRequestMessage(method, path);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body, options: JsonOptions);
        }

        if (idempotencyKey is not null)
        {
            request.Headers.Add("Idempotency-Key", idempotencyKey);
        }

        return request;
    }

    private async Task<HttpResponseMessage> SendCoreAsync(
        HttpMethod method, string path, object? body, string? idempotencyKey, CancellationToken ct)
    {
#pragma warning disable CA2000 // ownership transfers to the caller of SendCoreAsync; see CreateRequest's remark
        var request = CreateRequest(method, path, body, idempotencyKey);
#pragma warning restore CA2000
        var response = await httpClient.SendAsync(request, ct).ConfigureAwait(false);
        if (response.IsSuccessStatusCode)
        {
            return response;
        }

        var exception = await BuildExceptionAsync(response, ct).ConfigureAwait(false);
        response.Dispose();
        throw exception;
    }

    private static async Task<AccountApiException> BuildExceptionAsync(HttpResponseMessage response, CancellationToken ct)
    {
        IReadOnlyList<AccountApiError> errors = [];
        try
        {
            var payload = await response.Content.ReadFromJsonAsync<ErrorEnvelope>(JsonOptions, ct).ConfigureAwait(false);
            errors = payload?.Errors ?? [];
        }
        catch (JsonException)
        {
            // The body wasn't the errors[] envelope — surface the status code with no parsed errors.
        }

        return new AccountApiException(
            response.StatusCode, errors,
            $"The accounts service answered {(int)response.StatusCode} {response.ReasonPhrase}.");
    }

    private static string WithListQuery(string path, ListQuery? query)
    {
        if (query is null)
        {
            return path;
        }

        var parameters = new List<(string Key, string Value)>();
        foreach (var filter in query.Filters)
        {
            parameters.Add(("filter", $"{filter.Field}:{filter.Operation}:{filter.Value}"));
        }

        if (!string.IsNullOrEmpty(query.Search))
        {
            parameters.Add(("search", query.Search));
        }

        if (!string.IsNullOrEmpty(query.OrderBy))
        {
            parameters.Add(("orderBy", query.OrderBy));
        }

        if (query.Desc)
        {
            parameters.Add(("desc", "true"));
        }

        if (query.PageNumber is { } pageNumber)
        {
            parameters.Add(("pageNumber", pageNumber.ToString(CultureInfo.InvariantCulture)));
        }

        if (query.PageSize is { } pageSize)
        {
            parameters.Add(("pageSize", pageSize.ToString(CultureInfo.InvariantCulture)));
        }

        if (query.FromDate is { } fromDate)
        {
            parameters.Add(("fromDate", fromDate.ToString("O", CultureInfo.InvariantCulture)));
        }

        if (query.ToDate is { } toDate)
        {
            parameters.Add(("toDate", toDate.ToString("O", CultureInfo.InvariantCulture)));
        }

        return BuildUri(path, parameters);
    }

    private static string WithPostingsListQuery(string path, PostingsListQuery? query)
    {
        if (query is null)
        {
            return path;
        }

        var parameters = new List<(string Key, string Value)>();
        if (query.From is { } from)
        {
            parameters.Add(("from", from.ToString("O", CultureInfo.InvariantCulture)));
        }

        if (query.To is { } to)
        {
            parameters.Add(("to", to.ToString("O", CultureInfo.InvariantCulture)));
        }

        if (query.AccountId is { } accountId)
        {
            parameters.Add(("accountId", accountId.ToString()));
        }

        if (!string.IsNullOrEmpty(query.Direction))
        {
            parameters.Add(("direction", query.Direction));
        }

        if (!string.IsNullOrEmpty(query.Category))
        {
            parameters.Add(("category", query.Category));
        }

        if (!string.IsNullOrEmpty(query.Status))
        {
            parameters.Add(("status", query.Status));
        }

        if (!string.IsNullOrEmpty(query.Search))
        {
            parameters.Add(("search", query.Search));
        }

        if (!string.IsNullOrEmpty(query.OrderBy))
        {
            parameters.Add(("orderBy", query.OrderBy));
        }

        if (query.Desc)
        {
            parameters.Add(("desc", "true"));
        }

        if (query.PageNumber is { } pageNumber)
        {
            parameters.Add(("pageNumber", pageNumber.ToString(CultureInfo.InvariantCulture)));
        }

        if (query.PageSize is { } pageSize)
        {
            parameters.Add(("pageSize", pageSize.ToString(CultureInfo.InvariantCulture)));
        }

        return BuildUri(path, parameters);
    }

    private static string WithStatementQuery(string path, StatementQuery? query)
    {
        if (query is null)
        {
            return path;
        }

        var parameters = new List<(string Key, string Value)>();
        if (query.From is { } from)
        {
            parameters.Add(("from", from.ToString("O", CultureInfo.InvariantCulture)));
        }

        if (query.To is { } to)
        {
            parameters.Add(("to", to.ToString("O", CultureInfo.InvariantCulture)));
        }

        if (query.PageIndex is { } pageIndex)
        {
            parameters.Add(("pageIndex", pageIndex.ToString(CultureInfo.InvariantCulture)));
        }

        if (query.PageSize is { } pageSize)
        {
            parameters.Add(("pageSize", pageSize.ToString(CultureInfo.InvariantCulture)));
        }

        return BuildUri(path, parameters);
    }

    private static string WithStatusCountsQuery(string path, DateTimeOffset? from, DateTimeOffset? to)
    {
        var parameters = new List<(string Key, string Value)>();
        if (from is { } fromValue)
        {
            parameters.Add(("from", fromValue.ToString("O", CultureInfo.InvariantCulture)));
        }

        if (to is { } toValue)
        {
            parameters.Add(("to", toValue.ToString("O", CultureInfo.InvariantCulture)));
        }

        return BuildUri(path, parameters);
    }

    private static string BuildUri(string path, IReadOnlyList<(string Key, string Value)> parameters)
    {
        if (parameters.Count == 0)
        {
            return path;
        }

        var query = string.Join('&', parameters.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
        return $"{path}?{query}";
    }

    private sealed record ErrorEnvelope(IReadOnlyList<AccountApiError>? Errors);
}

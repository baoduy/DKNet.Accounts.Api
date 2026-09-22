using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.Client;

/// <summary>
/// One typed method per live route of the accounts service — 28 today (spec §3 "must stay true"). The
/// route each method calls is declared with <see cref="AccountRouteAttribute"/>, walked by reflection in
/// the route-parity acceptance test rather than kept twice. No method exists for the health, OpenAPI or
/// docs-browser addresses (R5).
/// </summary>
public interface IAccountClient
{
    // ---- Account groups (10) ----

    [AccountRoute("POST", "/v{version:apiVersion}/account-groups/")]
    Task<AccountGroupDto> CreateAccountGroupAsync(CreateAccountGroupRequest request, CancellationToken ct = default);

    [AccountRoute("GET", "/v{version:apiVersion}/account-groups/")]
    Task<PagedResult<AccountGroupDto>> GetAccountGroupsAsync(AccountGroupsListQuery? query = null, CancellationToken ct = default);

    [AccountRoute("GET", "/v{version:apiVersion}/account-groups/{id}")]
    Task<AccountGroupDto> GetAccountGroupAsync(Guid id, CancellationToken ct = default);

    /// <summary>Partial update: a null member is left unchanged. At least one must be supplied.</summary>
    [AccountRoute("PUT", "/v{version:apiVersion}/account-groups/{id}")]
    Task<AccountGroupDto> UpdateAccountGroupAsync(
        Guid id,
        string? name = null,
        string? description = null,
        IReadOnlyDictionary<string, string>? metadata = null,
        CancellationToken ct = default);

    [AccountRoute("POST", "/v{version:apiVersion}/account-groups/{id}/close")]
    Task<AccountGroupDto> CloseAccountGroupAsync(Guid id, CancellationToken ct = default);

    [AccountRoute("POST", "/v{version:apiVersion}/account-groups/{id}/activate")]
    Task<AccountGroupDto> ActivateAccountGroupAsync(Guid id, CancellationToken ct = default);

    [AccountRoute("DELETE", "/v{version:apiVersion}/account-groups/{id}")]
    Task DeleteAccountGroupAsync(Guid id, CancellationToken ct = default);

    [AccountRoute("GET", "/v{version:apiVersion}/account-groups/{id:guid}/balances")]
    Task<IReadOnlyList<AccountGroupBalanceLineDto>> GetAccountGroupBalancesAsync(Guid id, CancellationToken ct = default);

    /// <summary>Every value of <c>AccountGroupStatus</c>, zeros included, optionally narrowed to a
    /// created-on window (from/to only — any other narrowing is refused).</summary>
    [AccountRoute("GET", "/v{version:apiVersion}/account-groups/status-counts")]
    Task<IReadOnlyList<StatusCountDto>> GetAccountGroupStatusCountsAsync(
        DateTimeOffset? from = null, DateTimeOffset? toDate = null, CancellationToken ct = default);

    // ---- Accounts (8) ----

    [AccountRoute("POST", "/v{version:apiVersion}/accounts/")]
    Task<AccountDto> OpenAccountAsync(OpenAccountRequest request, CancellationToken ct = default);

    [AccountRoute("GET", "/v{version:apiVersion}/accounts/")]
    Task<PagedResult<AccountDto>> GetAccountsAsync(AccountsListQuery? query = null, CancellationToken ct = default);

    [AccountRoute("GET", "/v{version:apiVersion}/accounts/{id}")]
    Task<AccountDto> GetAccountAsync(Guid id, CancellationToken ct = default);

    [AccountRoute("GET", "/v{version:apiVersion}/accounts/{id:guid}/balance")]
    Task<AccountBalanceDto> GetAccountBalanceAsync(Guid id, CancellationToken ct = default);

    /// <summary>Partial update of name/metadata: a null member is left unchanged. At least one must be
    /// supplied. Status, overdraft limit and minimum balance go through <see cref="UpdateAccountAsync"/>.</summary>
    [AccountRoute("PUT", "/v{version:apiVersion}/accounts/{id}")]
    Task<AccountDto> ChangeAccountDetailsAsync(
        Guid id,
        string? name = null,
        IReadOnlyDictionary<string, string>? metadata = null,
        CancellationToken ct = default);

    /// <summary>{"status":"Closed"} closes the account — mirrors the service's own PATCH contract.</summary>
    [AccountRoute("PATCH", "/v{version:apiVersion}/accounts/{id:guid}")]
    Task<AccountDto> UpdateAccountAsync(
        Guid id, AccountStatus? status, decimal? overdraftLimit, decimal? minimumBalance, CancellationToken ct = default);

    [AccountRoute("GET", "/v{version:apiVersion}/accounts/{id:guid}/statement")]
    Task<PagedResult<PostingDto>> GetAccountStatementAsync(Guid id, StatementQuery? query = null, CancellationToken ct = default);

    /// <summary>Every value of <c>AccountStatus</c>, zeros included, optionally narrowed to a created-on
    /// window (from/to only — any other narrowing is refused).</summary>
    [AccountRoute("GET", "/v{version:apiVersion}/accounts/status-counts")]
    Task<IReadOnlyList<StatusCountDto>> GetAccountStatusCountsAsync(
        DateTimeOffset? from = null, DateTimeOffset? toDate = null, CancellationToken ct = default);

    /// <summary>The ledger's position by currency, across every account — one line per currency, never
    /// combined.</summary>
    [AccountRoute("GET", "/v{version:apiVersion}/accounts/balances")]
    Task<IReadOnlyList<LedgerBalanceLineDto>> GetLedgerBalancesAsync(CancellationToken ct = default);

    // ---- Currencies (6) ----

    [AccountRoute("GET", "/v{version:apiVersion}/currencies/")]
    Task<PagedResult<CurrencyDto>> GetCurrenciesAsync(CurrenciesListQuery? query = null, CancellationToken ct = default);

    [AccountRoute("GET", "/v{version:apiVersion}/currencies/{id}")]
    Task<CurrencyDto> GetCurrencyAsync(Guid id, CancellationToken ct = default);

    [AccountRoute("POST", "/v{version:apiVersion}/currencies/")]
    Task<CurrencyDto> CreateCurrencyAsync(CreateCurrencyRequest request, CancellationToken ct = default);

    [AccountRoute("PUT", "/v{version:apiVersion}/currencies/{id}")]
    Task<CurrencyDto> RenameCurrencyAsync(Guid id, string name, CancellationToken ct = default);

    [AccountRoute("POST", "/v{version:apiVersion}/currencies/{id}/activate")]
    Task<CurrencyDto> ActivateCurrencyAsync(Guid id, CancellationToken ct = default);

    [AccountRoute("POST", "/v{version:apiVersion}/currencies/{id}/deactivate")]
    Task<CurrencyDto> DeactivateCurrencyAsync(Guid id, CancellationToken ct = default);

    // ---- Postings (5) ----

    [AccountRoute("GET", "/v{version:apiVersion}/postings/")]
    Task<PagedResult<PostingDto>> ListPostingsAsync(PostingsListQuery? query = null, CancellationToken ct = default);

    /// <summary>Sends <paramref name="idempotencyKey"/> as the <c>Idempotency-Key</c> request header (spec
    /// §3 row 7), never as a body field.</summary>
    [AccountRoute("POST", "/v{version:apiVersion}/postings/")]
    Task<PostingDto> RecordPostingAsync(RecordPostingRequest request, string idempotencyKey, CancellationToken ct = default);

    /// <summary>Sends <paramref name="idempotencyKey"/> as the <c>Idempotency-Key</c> request header (spec
    /// §3 row 7), never as a body field.</summary>
    [AccountRoute("POST", "/v{version:apiVersion}/postings/batch")]
    Task<IReadOnlyList<PostingDto>> RecordPostingBatchAsync(
        RecordPostingBatchRequest request, string idempotencyKey, CancellationToken ct = default);

    [AccountRoute("GET", "/v{version:apiVersion}/postings/{id:guid}")]
    Task<PostingDto> GetPostingAsync(Guid id, CancellationToken ct = default);

    /// <summary>Reversal requires both: <paramref name="reason"/> travels in the body and is recorded as the
    /// reversal posting's description, <paramref name="idempotencyKey"/> as the <c>Idempotency-Key</c> request
    /// header — a retry under the same key returns the reversal already written rather than a refusal.</summary>
    [AccountRoute("POST", "/v{version:apiVersion}/postings/{id:guid}/reverse")]
    Task<PostingDto> ReversePostingAsync(
        Guid id, string reason, string idempotencyKey, CancellationToken ct = default);
}

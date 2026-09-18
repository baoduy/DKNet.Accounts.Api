using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.Client;

/// <summary>
/// Default <see cref="IAccountClient"/> implementation. Takes an already-configured <see cref="HttpClient"/>
/// (typically resolved from the typed-client registration <see cref="ServiceCollectionExtensions.AddAccountClient"/>
/// wires up) — this constructor is also the integration-test seam: a caller can build one directly around
/// any <see cref="HttpClient"/>, including a <c>WebApplicationFactory</c>'s in-memory one (spec's test
/// seam note). Never obtains, stores, or logs a credential of its own (R3) — every request the underlying
/// <see cref="HttpClient"/> sends carries only whatever <see cref="DelegatingHandler"/> the caller supplied.
/// </summary>
public sealed class AccountClient(HttpClient httpClient) : IAccountClient
{
    /// <summary>The underlying <see cref="HttpClient"/> every request will be sent through once the Build
    /// stage implements each method below.</summary>
    public HttpClient HttpClient { get; } = httpClient;

    public Task<AccountGroupDto> CreateAccountGroupAsync(CreateAccountGroupRequest request, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<PagedResult<AccountGroupDto>> GetAccountGroupsAsync(AccountGroupsListQuery? query = null, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountGroupDto> GetAccountGroupAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountGroupDto> RenameAccountGroupAsync(Guid id, string name, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountGroupDto> ChangeAccountGroupDescriptionAsync(Guid id, string? description, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountGroupDto> ChangeAccountGroupMetadataAsync(
        Guid id, IReadOnlyDictionary<string, string>? metadata, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountGroupDto> CloseAccountGroupAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountGroupDto> ActivateAccountGroupAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task DeleteAccountGroupAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<IReadOnlyList<AccountGroupBalanceLineDto>> GetAccountGroupBalancesAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountDto> OpenAccountAsync(OpenAccountRequest request, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<PagedResult<AccountDto>> GetAccountsAsync(AccountsListQuery? query = null, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountDto> GetAccountAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountBalanceDto> GetAccountBalanceAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountDto> RenameAccountAsync(Guid id, string name, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountDto> ChangeAccountMetadataAsync(
        Guid id, IReadOnlyDictionary<string, string>? metadata, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<AccountDto> UpdateAccountAsync(
        Guid id, AccountStatus? status, decimal? overdraftLimit, decimal? minimumBalance, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<PagedResult<PostingDto>> GetAccountStatementAsync(Guid id, StatementQuery? query = null, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<PagedResult<CurrencyDto>> GetCurrenciesAsync(CurrenciesListQuery? query = null, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<CurrencyDto> GetCurrencyAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<CurrencyDto> CreateCurrencyAsync(CreateCurrencyRequest request, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<CurrencyDto> RenameCurrencyAsync(Guid id, string name, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<CurrencyDto> ActivateCurrencyAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<CurrencyDto> DeactivateCurrencyAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<PostingDto> RecordPostingAsync(RecordPostingRequest request, string idempotencyKey, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<IReadOnlyList<PostingDto>> RecordPostingBatchAsync(
        RecordPostingBatchRequest request, string idempotencyKey, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<PostingDto> GetPostingAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();

    public Task<PostingDto> ReversePostingAsync(Guid id, CancellationToken ct = default) =>
        throw new NotImplementedException();
}

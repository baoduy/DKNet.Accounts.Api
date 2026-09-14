namespace DKNet.Accounts.AppServices.Accounts.V1.Actions;

/// <summary>
/// Partial update — <c>PATCH /accounts/{id}</c>. Setting <see cref="Status"/> to
/// <see cref="AccountStatus.Closed"/> is how an account is closed; refused while it holds any balance or
/// held amount.
/// </summary>
public sealed record UpdateAccountRequest : Fluents.Requests.IWitResponse<AccountDto>
{
    public Guid Id { get; set; }

    public string? Name { get; set; }

    public AccountStatus? Status { get; set; }

    public decimal? OverdraftLimit { get; set; }

    public decimal? MinimumBalance { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }
}

internal sealed class UpdateAccountCommandHandler : Fluents.Requests.IHandler<UpdateAccountRequest, AccountDto>
{
    public Task<IResult<AccountDto>> OnHandle(UpdateAccountRequest request, CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}

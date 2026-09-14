namespace DKNet.Accounts.AppServices.Accounts.V1.Actions;

/// <summary>
/// Opening an account permitted to go negative with no overdraft limit is refused (an account must always
/// have a determinate floor).
/// </summary>
public sealed record OpenAccountRequest : Fluents.Requests.IWitResponse<AccountDto>
{
    public Guid GroupId { get; set; }

    public string Name { get; set; } = null!;

    public string Currency { get; set; } = null!;

    public AccountClassification Classification { get; set; }

    public bool PermittedToGoNegative { get; set; }

    public decimal? OverdraftLimit { get; set; }

    public decimal? MinimumBalance { get; set; }

    public string? ExternalReference { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }
}

internal sealed class OpenAccountCommandHandler : Fluents.Requests.IHandler<OpenAccountRequest, AccountDto>
{
    public Task<IResult<AccountDto>> OnHandle(OpenAccountRequest request, CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}

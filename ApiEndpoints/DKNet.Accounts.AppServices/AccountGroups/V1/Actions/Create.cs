namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

public sealed record CreateAccountGroupRequest : Fluents.Requests.IWitResponse<AccountGroupDto>
{
    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public AccountGroupType Type { get; set; }

    public string OwnerId { get; set; } = null!;

    public Guid? ParentId { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }
}

internal sealed class CreateAccountGroupCommandHandler
    : Fluents.Requests.IHandler<CreateAccountGroupRequest, AccountGroupDto>
{
    public Task<IResult<AccountGroupDto>> OnHandle(
        CreateAccountGroupRequest request,
        CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}

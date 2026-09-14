namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

/// <summary>
/// Partial update — <c>PATCH /account-groups/{id}</c>. Unset properties leave the current value untouched.
/// Setting <see cref="Status"/> to <see cref="AccountGroupStatus.Closed"/> is how a group is closed.
/// </summary>
public sealed record UpdateAccountGroupRequest : Fluents.Requests.IWitResponse<AccountGroupDto>
{
    public Guid Id { get; set; }

    public string? Name { get; set; }

    public string? Description { get; set; }

    public AccountGroupStatus? Status { get; set; }

    public Guid? ParentId { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }
}

internal sealed class UpdateAccountGroupCommandHandler
    : Fluents.Requests.IHandler<UpdateAccountGroupRequest, AccountGroupDto>
{
    public Task<IResult<AccountGroupDto>> OnHandle(
        UpdateAccountGroupRequest request,
        CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}

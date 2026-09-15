using DKNet.EfCore.Abstractions.Attributes;
using DKNet.Accounts.Domains.Share;

namespace DKNet.Accounts.Domains.Features.AccountGroups.Entities;

/// <summary>
/// The accounting-classification role a group of accounts plays (DRK-1242 §3).
/// </summary>
public enum AccountGroupType
{
    Customer,
    Merchant,
    Internal,
    Suspense,
    Settlement
}

public enum AccountGroupStatus
{
    Active,
    Closed
}

/// <summary>
/// A named, ownable collection of accounts. Groups can nest under a mutable parent; the ancestor chain must
/// never form a cycle (R7) — that check needs the repository to walk the chain, so it lives in the command
/// handler (<see cref="Reparent"/> only assigns). Closing a group whose accounts still hold a balance is
/// refused — again a cross-aggregate check the handler performs before calling <see cref="Close"/>.
/// </summary>
public sealed class AccountGroup : AggregateRoot
{
    #region Constructors

    /// <summary>
    /// Creates a new, active account group. No acting-user parameter (DRK-1277 C3) — this constructor is
    /// <see cref="CrudCreateAttribute"/>-generated into <c>CreateAccountGroupRequest</c>, so any trailing
    /// user parameter would be a caller-settable body field. <c>CreatedBy</c> is left unset here and stamped
    /// on save by <c>DataOwnerHook</c>/<c>IPrincipalProvider</c> (DRK-1277 §11/§12).
    /// </summary>
    [CrudCreate]
    public AccountGroup(
        string code,
        string name,
        string? description,
        AccountGroupType type,
        string ownerId,
        Guid? parentId,
        IReadOnlyDictionary<string, string>? metadata)
    {
        Code = code;
        Name = name;
        Description = description;
        Type = type;
        OwnerId = ownerId;
        ParentId = parentId;
        Metadata = metadata;
        Status = AccountGroupStatus.Active;
    }

    private AccountGroup()
    {
    }

    #endregion

    #region Properties

    public string Code { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public string? Description { get; private set; }

    public AccountGroupType Type { get; private set; }

    public AccountGroupStatus Status { get; private set; }

    public string OwnerId { get; private set; } = null!;

    public Guid? ParentId { get; private set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; private set; }

    #endregion

    #region Methods

    /// <summary>
    /// Renames the group. No acting-user parameter (DRK-1277 C3) — this is the first <see cref="CrudUpdateAttribute"/>
    /// member declared on this type, so it lands on the plain <c>PUT {id}</c> route; <c>UpdatedBy</c> is left
    /// for <c>DataOwnerHook</c> to stamp on save.
    /// </summary>
    [CrudUpdate]
    public void Rename(string name)
    {
        Name = name;
    }

    /// <summary>No acting-user parameter (DRK-1277 C3) — lands on <c>{id}/change-description</c>.</summary>
    [CrudUpdate]
    public void ChangeDescription(string? description)
    {
        Description = description;
    }

    /// <summary>No acting-user parameter (DRK-1277 C3) — lands on <c>{id}/change-metadata</c>.</summary>
    [CrudUpdate]
    public void ChangeMetadata(IReadOnlyDictionary<string, string>? metadata)
    {
        Metadata = metadata;
    }

    /// <summary>
    /// Re-parents this group to <paramref name="parentId"/> (or clears it). Ancestor-cycle detection (R7)
    /// needs the full chain from the repository and is the caller's responsibility — this method only assigns.
    /// </summary>
    public void Reparent(Guid? parentId, string userId)
    {
        ParentId = parentId;
        SetUpdatedBy(userId);
    }

    public void Activate(string userId)
    {
        Status = AccountGroupStatus.Active;
        SetUpdatedBy(userId);
    }

    /// <summary>
    /// Closes the group. Refusing this while any account it holds still carries a balance is a cross-aggregate
    /// check the caller must perform first — this method only assigns the terminal status.
    /// </summary>
    public void Close(string userId)
    {
        Status = AccountGroupStatus.Closed;
        SetUpdatedBy(userId);
    }

    #endregion
}

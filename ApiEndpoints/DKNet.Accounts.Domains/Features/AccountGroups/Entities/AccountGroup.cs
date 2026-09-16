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
/// A named, ownable collection of accounts — flat, holds accounts only, never another group. Closing a group
/// whose accounts still hold a balance is refused — a cross-aggregate check the handler performs before
/// calling <see cref="Close"/>.
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
        IReadOnlyDictionary<string, string>? metadata)
    {
        Code = code;
        Name = name;
        Description = description;
        Type = type;
        OwnerId = ownerId;
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
    /// Reactivates a closed group (DRK-1418 §3 row 1) — generated into <c>ActivateAccountGroupRequest</c> on
    /// its own <c>{id}/activate</c> route. No acting-user parameter (DRK-1277 C3).
    /// </summary>
    [CrudAction]
    public void Activate()
    {
        Status = AccountGroupStatus.Active;
    }

    /// <summary>
    /// Closes the group (DRK-1418 §3 row 1) — generated into <c>CloseAccountGroupRequest</c> on its own
    /// <c>{id}/close</c> route. Refusing this while any account it holds still carries a balance is a
    /// cross-aggregate check enforced by that request's own validator before this method ever runs — this
    /// method only assigns the terminal status. No acting-user parameter (DRK-1277 C3).
    /// </summary>
    [CrudAction]
    public void Close()
    {
        Status = AccountGroupStatus.Closed;
    }

    #endregion
}

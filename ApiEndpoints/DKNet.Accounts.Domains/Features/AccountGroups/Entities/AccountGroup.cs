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
    /// user parameter would be a caller-settable body field. <c>CreatedBy</c> is stamped afterwards by
    /// <see cref="StampCreatedBy"/>, called once by the hand-written create handler — this API is
    /// machine-to-machine only, and <c>DataOwnerHook</c>'s generic <c>IPrincipalProvider</c> resolves a human
    /// principal (a claim shape no calling system here ever carries; see
    /// <c>ICallingSystemAccessor</c>/<c>CallingSystemAccessor</c>'s own remarks), so it cannot be relied on for
    /// this stamp.
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
        : base(Guid.NewGuid())
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
    /// Stamps the creator explicitly. Called once, immediately after construction, by the hand-written
    /// create handler using <c>ICallingSystemAccessor</c>'s trusted calling-system identity — never from any
    /// request field, since this member is never attached to the generated request the way a constructor or
    /// <see cref="Rename"/>'s <c>userId</c> parameter would be.
    /// </summary>
    public void StampCreatedBy(string byUser) => SetCreatedBy(byUser);

    public void Rename(string name, string userId)
    {
        Name = name;
        SetUpdatedBy(userId);
    }

    public void ChangeDescription(string? description, string userId)
    {
        Description = description;
        SetUpdatedBy(userId);
    }

    public void ChangeMetadata(IReadOnlyDictionary<string, string>? metadata, string userId)
    {
        Metadata = metadata;
        SetUpdatedBy(userId);
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

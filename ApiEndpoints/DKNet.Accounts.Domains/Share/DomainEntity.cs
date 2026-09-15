using DKNet.EfCore.Abstractions.Entities;

namespace DKNet.Accounts.Domains.Share;

public abstract class DomainEntity : AuditedEntity<Guid>
{
    #region Constructors

    /// <inheritdoc />
    protected DomainEntity(Guid id, string createdBy, DateTimeOffset? createdOn = null) : base(id)
    {
        SetCreatedBy(createdBy, createdOn);
    }

    /// <summary>
    /// Assigns a fresh identity, leaving <c>CreatedBy</c> for <c>DataOwnerHook</c> to stamp on save (DRK-1277
    /// §11/§12) — used by every <see cref="AggregateRoot"/> subclass, including a <c>[CrudCreate]</c>-attributed
    /// constructor (DRK-1277 C3), which must not accept a caller-settable acting-user parameter.
    /// </summary>
    protected DomainEntity() : base(Guid.NewGuid())
    {
    }

    #endregion
}
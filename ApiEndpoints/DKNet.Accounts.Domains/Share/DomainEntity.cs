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

    /// <summary>Assigns a fresh identity only, leaving <c>CreatedBy</c> for the save-time hook to stamp.</summary>
    protected DomainEntity(Guid id) : base(id)
    {
    }

    /// <inheritdoc />
    protected DomainEntity()
    {
    }

    #endregion
}
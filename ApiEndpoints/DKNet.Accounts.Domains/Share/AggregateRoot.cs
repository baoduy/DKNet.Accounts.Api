namespace DKNet.Accounts.Domains.Share;

public abstract class AggregateRoot : DomainEntity
{
    #region Constructors

    protected AggregateRoot(string createdBy, DateTimeOffset? createdOn = null)
        : this(Guid.NewGuid(), createdBy, createdOn)
    {
    }

    protected AggregateRoot(Guid id, string createdBy, DateTimeOffset? createdOn = null)
        : base(id,createdBy, createdOn)
    {
        SetCreatedBy(createdBy, createdOn);
    }

    /// <summary>
    /// Assigns a fresh identity without stamping a creator — used by a <c>[CrudCreate]</c>-attributed
    /// constructor (DRK-1277 C3), which must not accept a caller-settable acting-user parameter. The creator
    /// is stamped afterwards, explicitly, by whatever hand-written handler owns the create request (see e.g.
    /// <c>AccountGroup.StampCreatedBy</c>) — never by the generic <c>DataOwnerHook</c>, which resolves a human
    /// principal this machine-to-machine API never has.
    /// </summary>
    protected AggregateRoot(Guid id)
        : base(id)
    {
    }

    /// <inheritdoc />
    protected AggregateRoot()
    {
    }

    #endregion
}
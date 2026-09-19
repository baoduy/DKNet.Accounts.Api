using DKNet.EfCore.Abstractions.Attributes;
using DKNet.Accounts.Domains.Share;

namespace DKNet.Accounts.Domains.Features.Currencies.Entities;

/// <summary>
/// A reference currency and the number of decimal places it is legally denominated to (R5). Persisted
/// reference data — replaces the previous static <c>Currency.All</c> lookup so a currency can be
/// looked up, activated, or deactivated without a code change.
/// </summary>
public sealed class Currency : AggregateRoot
{
    #region Constructors

    /// <summary>
    /// Creates a new, active currency. No acting-user parameter (DRK-1277 C3) — this constructor is
    /// <see cref="CrudCreateAttribute"/>-generated into <c>CreateCurrencyRequest</c>, so any trailing
    /// user parameter would be a caller-settable body field. <c>CreatedBy</c> is left unset here and stamped
    /// on save by <c>DataOwnerHook</c>/<c>IPrincipalProvider</c> (DRK-1277 §11/§12).
    /// </summary>
    [CrudCreate]
    public Currency(string code, string name, int decimalPlaces)
    {
        // Normalised, not rejected: case is not part of a currency's identity — "usd" and "USD" are the
        // same currency, so the unique index has to see one spelling. Uppercasing here covers every
        // caller, including the migration seed.
        Code = code.ToUpperInvariant();
        Name = name;
        DecimalPlaces = decimalPlaces;
        IsActive = true;
    }

    private Currency()
    {
    }

    #endregion

    #region Properties

    public string Code { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    /// <summary>
    /// The number of decimal places this currency is legally denominated to. Immutable after create:
    /// <see cref="PostingAmount.Validate"/> rounds every posting amount against it, so changing it would
    /// retroactively invalidate every amount already posted and stored under the old precision. This is a
    /// deliberate decision, not an omission — there is no <c>ChangeDecimalPlaces</c> method.
    /// </summary>
    public int DecimalPlaces { get; private set; }

    public bool IsActive { get; private set; }

    #endregion

    #region Methods

    /// <summary>
    /// Renames the currency. No acting-user parameter (DRK-1277 C3) — this is the first <see cref="CrudUpdateAttribute"/>
    /// member declared on this type, so it lands on the plain <c>PUT {id}</c> route; <c>UpdatedBy</c> is left
    /// for <c>DataOwnerHook</c> to stamp on save.
    /// </summary>
    [CrudUpdate]
    public void Rename(string name)
    {
        Name = name;
    }

    /// <summary>No acting-user parameter (DRK-1277 C3) — lands on <c>{id}/activate</c>.</summary>
    [CrudAction]
    public void Activate()
    {
        IsActive = true;
    }

    /// <summary>No acting-user parameter (DRK-1277 C3) — lands on <c>{id}/deactivate</c>.</summary>
    [CrudAction]
    public void Deactivate()
    {
        IsActive = false;
    }

    #endregion
}

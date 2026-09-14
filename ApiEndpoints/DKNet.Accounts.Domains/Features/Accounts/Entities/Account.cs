using DKNet.Accounts.Domains.Share;

namespace DKNet.Accounts.Domains.Features.Accounts.Entities;

public enum AccountClassification
{
    Asset,
    Liability,
    Equity,
    Income,
    Expense
}

public enum AccountStatus
{
    Active,
    Frozen,
    Dormant,
    Closed
}

/// <summary>
/// A single-currency account inside an <c>AccountGroup</c> (referenced by id only — DKNET-AGG-004). Postings
/// are the next stage; this delivery keeps every account at a permanently zero balance (R8), so the invariants
/// below (floor, status, close-with-balance) are enforced structurally even though the "still holds a
/// balance" guards can never actually trigger until postings exist.
/// </summary>
public sealed class Account : AggregateRoot
{
    #region Constructors

    /// <summary>
    /// Opens a new, active account. Throws if <paramref name="permittedToGoNegative"/> is set with no
    /// <paramref name="overdraftLimit"/> — callers must validate via <see cref="AccountFloorPolicy"/> first so
    /// the failure surfaces as a business-rule refusal, not this exception.
    /// </summary>
    public Account(
        Guid groupId,
        string accountNumber,
        string name,
        string currencyCode,
        AccountClassification classification,
        bool permittedToGoNegative,
        decimal? overdraftLimit,
        decimal? minimumBalance,
        string? externalReference,
        IReadOnlyDictionary<string, string>? metadata,
        string byUser)
        : base(byUser)
    {
        if (AccountFloorPolicy.RequiresOverdraftLimit(permittedToGoNegative, overdraftLimit))
        {
            throw new InvalidOperationException(
                "An account permitted to go negative with no overdraft limit has no determinate floor.");
        }

        GroupId = groupId;
        AccountNumber = accountNumber;
        Name = name;
        CurrencyCode = currencyCode;
        Classification = classification;
        PermittedToGoNegative = permittedToGoNegative;
        OverdraftLimit = overdraftLimit;
        MinimumBalance = minimumBalance;
        ExternalReference = externalReference;
        Metadata = metadata;
        Status = AccountStatus.Active;
    }

    private Account()
    {
    }

    #endregion

    #region Properties

    public string AccountNumber { get; private set; } = null!;

    public Guid GroupId { get; private set; }

    public string Name { get; private set; } = null!;

    /// <summary>Immutable once set — there is no update field for it, so currency can never change once a
    /// posting exists (§3 row 4).</summary>
    public string CurrencyCode { get; private set; } = null!;

    public AccountClassification Classification { get; private set; }

    public AccountStatus Status { get; private set; }

    /// <summary>Always 0 in this delivery — postings (the only thing that would move it) are the next stage.</summary>
    public decimal Balance { get; private set; }

    /// <summary>R8: always 0 in this delivery — no hold mechanism exists yet.</summary>
    public decimal HeldAmount { get; private set; }

    /// <summary>R8: always equal to <see cref="Balance"/> in this delivery.</summary>
    public decimal AvailableBalance => Balance;

    public decimal? OverdraftLimit { get; private set; }

    public decimal? MinimumBalance { get; private set; }

    public bool PermittedToGoNegative { get; private set; }

    /// <summary>Always 0 until the next stage's postings advance it.</summary>
    public long StreamPosition { get; private set; }

    public DateTimeOffset? LastPostedOn { get; private set; }

    public string? ExternalReference { get; private set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; private set; }

    /// <summary>When the account was opened — the aggregate's own creation timestamp.</summary>
    public DateTimeOffset OpenedOn => CreatedOn;

    public DateTimeOffset? ClosedOn { get; private set; }

    #endregion

    #region Methods

    public void Rename(string name, string userId)
    {
        Name = name;
        SetUpdatedBy(userId);
    }

    /// <summary>
    /// Re-status. R9: every direction is permitted, including <c>Closed</c> → <c>Active</c> (reopening) and
    /// <c>Dormant</c> → <c>Active</c> (reactivation). Refusing to close a balance-carrying account is a
    /// cross-aggregate-free but still handler-owned check (it reads <see cref="Balance"/>/<see cref="HeldAmount"/>
    /// before calling this) — this method only assigns the terminal status and its timestamp.
    /// </summary>
    public void ChangeStatus(AccountStatus status, string userId)
    {
        Status = status;
        ClosedOn = status == AccountStatus.Closed ? DateTimeOffset.UtcNow : null;
        SetUpdatedBy(userId);
    }

    public void ChangeOverdraftLimit(decimal? overdraftLimit, string userId)
    {
        OverdraftLimit = overdraftLimit;
        SetUpdatedBy(userId);
    }

    public void ChangeMinimumBalance(decimal? minimumBalance, string userId)
    {
        MinimumBalance = minimumBalance;
        SetUpdatedBy(userId);
    }

    public void ChangeMetadata(IReadOnlyDictionary<string, string>? metadata, string userId)
    {
        Metadata = metadata;
        SetUpdatedBy(userId);
    }

    #endregion
}

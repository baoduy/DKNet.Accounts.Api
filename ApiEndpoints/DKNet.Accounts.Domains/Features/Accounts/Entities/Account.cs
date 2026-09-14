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

    /// <summary>
    /// Appends one posting's effect to this account: allocates the next (gapless, recording-order) stream
    /// position, applies the signed value the posting's direction and this account's accounting
    /// classification produce, advances <see cref="Balance"/> and <see cref="LastPostedOn"/>. Enforces the
    /// status gate (frozen/closed refuse everything; dormant refuses a debit only) and, unless
    /// <paramref name="isReversal"/>, the floor (R1/R2/R3) — a reversal is exempt from the floor check only,
    /// never from the status gate. Returns a failed <see cref="PostingApplication"/> (no state change) when
    /// either guard refuses; callers must not call this more than once per posting.
    /// </summary>
    public PostingApplication TryApplyPosting(bool isDebit, decimal amount, DateTimeOffset postedAt, bool isReversal = false)
    {
        var refusal = AccountPostingPolicy.StatusGate(Status, isDebit);
        if (refusal != PostingRefusalReason.None)
        {
            return new PostingApplication(false, refusal, 0, 0, Balance);
        }

        var signedValue = AccountPostingPolicy.SignedValue(Classification, isDebit, amount);
        var projectedBalance = Balance + signedValue;

        if (!isReversal)
        {
            var floor = AccountFloorPolicy.Floor(PermittedToGoNegative, OverdraftLimit, MinimumBalance);
            if (projectedBalance < floor)
            {
                return new PostingApplication(false, PostingRefusalReason.BelowFloor, 0, 0, Balance);
            }
        }

        StreamPosition += 1;
        Balance = projectedBalance;
        LastPostedOn = postedAt;

        return new PostingApplication(true, PostingRefusalReason.None, StreamPosition, signedValue, Balance);
    }

    #endregion
}

/// <summary>Why <see cref="Account.TryApplyPosting"/> refused to apply a posting, or <see cref="None"/> when
/// it was applied.</summary>
public enum PostingRefusalReason
{
    None,
    AccountClosed,
    AccountFrozen,
    AccountDormantDebitRefused,
    BelowFloor
}

/// <summary>The outcome of <see cref="Account.TryApplyPosting"/>: on success, the position/signed value/
/// balance-after the posting must be recorded with; on refusal, <see cref="Refusal"/> names why and no state
/// changed.</summary>
public readonly record struct PostingApplication(
    bool Success,
    PostingRefusalReason Refusal,
    long Position,
    decimal SignedValue,
    decimal BalanceAfter);

/// <summary>
/// R.. (DRK-1242 §3): whether a debit or a credit increases an account's balance depends on its accounting
/// classification (Asset/Expense: debit increases; Liability/Equity/Income: credit increases) — and the
/// status gate a posting (normal or reversal alike) must clear before it can move an account's balance at
/// all. Kept as a pure static policy (not a method on <see cref="Account"/>) so it can be unit-tested and
/// reused without constructing an account.
/// </summary>
public static class AccountPostingPolicy
{
    public static decimal SignedValue(AccountClassification classification, bool isDebit, decimal amount)
    {
        var debitIncreases = classification is AccountClassification.Asset or AccountClassification.Expense;
        var increases = isDebit == debitIncreases;
        return increases ? amount : -amount;
    }

    public static PostingRefusalReason StatusGate(AccountStatus status, bool isDebit) => status switch
    {
        AccountStatus.Closed => PostingRefusalReason.AccountClosed,
        AccountStatus.Frozen => PostingRefusalReason.AccountFrozen,
        AccountStatus.Dormant when isDebit => PostingRefusalReason.AccountDormantDebitRefused,
        _ => PostingRefusalReason.None
    };
}

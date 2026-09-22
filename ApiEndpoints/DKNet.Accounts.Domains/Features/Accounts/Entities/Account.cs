using DKNet.EfCore.Abstractions.Attributes;
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
/// A single-currency account inside an <c>AccountGroup</c> (referenced by id only — DKNET-AGG-004).
/// <see cref="TryApplyPosting"/> is the only way <see cref="Balance"/>/<see cref="StreamPosition"/> move — the
/// invariants below (floor, status, close-with-balance) guard that real, postings-driven balance.
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
        IReadOnlyDictionary<string, string>? metadata)
    {
        if (AccountFloorPolicy.RequiresOverdraftLimit(permittedToGoNegative, overdraftLimit))
        {
            throw new InvalidOperationException(
                "An account permitted to go negative with no overdraft limit has no determinate floor.");
        }

        GroupId = groupId;
        // Uppercased for the same reason AccountGroup.Code is: case is not part of an account's identity,
        // and its unique index must see one spelling of a caller-chosen suffix.
        AccountNumber = accountNumber.ToUpperInvariant();
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

    /// <summary>The running total of every posting applied via <see cref="TryApplyPosting"/> (signed per
    /// <see cref="AccountPostingPolicy.SignedValue"/>) — not permanently 0.</summary>
    public decimal Balance { get; private set; }

    /// <summary>Always 0 — no hold mechanism exists yet (still R8, unchanged by postings landing).</summary>
    public decimal HeldAmount { get; private set; }

    /// <summary>Always equal to <see cref="Balance"/> — there is nothing to hold against yet.</summary>
    public decimal AvailableBalance => Balance;

    public decimal? OverdraftLimit { get; private set; }

    public decimal? MinimumBalance { get; private set; }

    public bool PermittedToGoNegative { get; private set; }

    /// <summary>The account's own posting count — advanced by one on every successful <see cref="TryApplyPosting"/>.</summary>
    public long StreamPosition { get; private set; }

    public DateTimeOffset? LastPostedOn { get; private set; }

    public string? ExternalReference { get; private set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; private set; }

    /// <summary>When the account was opened — the aggregate's own creation timestamp.</summary>
    public DateTimeOffset OpenedOn => CreatedOn;

    public DateTimeOffset? ClosedOn { get; private set; }

    #endregion

    #region Methods

    /// <summary>
    /// Partial update of the account's editable attributes — the one <see cref="CrudUpdateAttribute"/> member on
    /// this type, so it lands on the plain <c>PUT {id}</c> route and replaces the former rename /
    /// change-metadata pair. A null member means "leave this one alone", so no field can be cleared through
    /// this route; a body with every member null is refused by <c>ChangeDetailsAccountRequestValidator</c>
    /// rather than answered as a silent no-op. Named <c>ChangeDetails</c>, not <c>Update</c>: the generated
    /// request would then collide by name with the hand-written <c>UpdateAccountRequest</c> that backs the
    /// status/overdraft/minimum-balance <c>PATCH {id}</c> route. No acting-user parameter (DRK-1277 C3) —
    /// <c>UpdatedBy</c> is left for <c>DataOwnerHook</c> to stamp on save.
    /// </summary>
    [CrudUpdate]
    public void ChangeDetails(string? name, IReadOnlyDictionary<string, string>? metadata)
    {
        if (name is not null)
        {
            Name = name;
        }

        if (metadata is not null)
        {
            Metadata = metadata;
        }
    }

    /// <summary>
    /// Re-status. R9: every direction is permitted, including <c>Closed</c> → <c>Active</c> (reopening) and
    /// <c>Dormant</c> → <c>Active</c> (reactivation). Refusing to close a balance-carrying account is a
    /// cross-aggregate-free but still handler-owned check (it reads <see cref="Balance"/>/<see cref="HeldAmount"/>
    /// before calling this) — this method only assigns the terminal status and its timestamp.
    /// </summary>
    public void ChangeStatus(AccountStatus status)
    {
        Status = status;
        ClosedOn = status == AccountStatus.Closed ? DateTimeOffset.UtcNow : null;
    }

    public void ChangeOverdraftLimit(decimal? overdraftLimit)
    {
        OverdraftLimit = overdraftLimit;
    }

    public void ChangeMinimumBalance(decimal? minimumBalance)
    {
        MinimumBalance = minimumBalance;
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

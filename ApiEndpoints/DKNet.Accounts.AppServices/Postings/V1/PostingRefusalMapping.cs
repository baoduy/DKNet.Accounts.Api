using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.AppServices.Postings.V1;

/// <summary>Maps <see cref="Account.TryApplyPosting"/>'s domain-level <see cref="PostingRefusalReason"/> onto
/// this service's stable <see cref="LedgerErrors"/> codes — kept in one place so Record, RecordBatch and
/// Reverse map identically.</summary>
internal static class PostingRefusalMapping
{
    public static Error ToError(this PostingRefusalReason reason) => reason switch
    {
        PostingRefusalReason.AccountClosed =>
            LedgerErrors.Error(LedgerErrors.AccountClosed, "The account is closed."),
        PostingRefusalReason.AccountFrozen =>
            LedgerErrors.Error(LedgerErrors.AccountFrozen, "The account is frozen."),
        PostingRefusalReason.AccountDormantDebitRefused =>
            LedgerErrors.Error(LedgerErrors.AccountDormantDebitRefused, "A dormant account refuses a debit."),
        PostingRefusalReason.BelowFloor =>
            LedgerErrors.Error(LedgerErrors.InsufficientFunds, "The posting would take the account below its floor."),
        PostingRefusalReason.AmountOutOfRange =>
            LedgerErrors.Error(LedgerErrors.AmountOutOfRange, "The amount, or the balance it would leave, is beyond 999,999,999,999.999999."),
        _ => LedgerErrors.Error("UNKNOWN_REFUSAL", "The posting was refused.")
    };
}

/// <summary>Shared per-account lock bound — see <c>IAccountLockProvider</c>.</summary>
internal static class PostingLocking
{
    public static readonly TimeSpan LockTimeout = TimeSpan.FromSeconds(10);
}

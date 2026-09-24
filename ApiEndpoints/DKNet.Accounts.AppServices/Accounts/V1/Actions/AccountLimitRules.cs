using DKNet.Accounts.Domains.Share;

namespace DKNet.Accounts.AppServices.Accounts.V1.Actions;

/// <summary>
/// DRK-1719 R1/R2: an overdraft limit or minimum balance is stored in the same <c>numeric(18,6)</c> column
/// shape as every other amount, so it follows the rule a posting amount already follows — never finer than
/// its account's currency, never beyond <see cref="PostingAmount.Ceiling"/>. A validation rule rather than a
/// handler check: only a validation failure carries the refused field on its <c>errors[]</c> entry, and it
/// runs before the handler, so a refused limit never reaches the account.
/// </summary>
internal static class AccountLimitRules
{
    /// <summary>Refuses a limit beyond the ceiling, then one finer than <paramref name="decimalPlacesOf"/>:
    /// the account's currency's decimal places, or null when that currency is unknown — the handler refuses
    /// an unknown currency on its own terms, so this rule lets it through.</summary>
    public static void LedgerLimit<T>(
        this IRuleBuilderInitial<T, decimal?> rule,
        Func<T, CancellationToken, Task<int?>> decimalPlacesOf) =>
        rule.Cascade(CascadeMode.Stop)
            .Must(limit => limit is null || !PostingAmount.ExceedsCeiling(limit.Value))
            .WithErrorCode(LedgerErrors.AmountOutOfRange)
            .WithMessage("'{PropertyName}' is beyond 999,999,999,999.999999.")
            .MustAsync(async (request, limit, ct) => limit is null
                || await decimalPlacesOf(request, ct) is not { } places
                || PostingAmount.HasAtMostPlaces(limit.Value, places))
            .WithErrorCode(LedgerErrors.InvalidLimitAmount)
            .WithMessage("'{PropertyName}' has more decimal places than the account's currency.");
}

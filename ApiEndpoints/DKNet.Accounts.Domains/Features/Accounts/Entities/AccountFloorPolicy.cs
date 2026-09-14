namespace DKNet.Accounts.Domains.Features.Accounts.Entities;

/// <summary>
/// R1/R2/R3: every account has exactly one determinate floor at all times. Where more than one floor
/// control is set, the most restrictive (least negative) one binds. An account permitted to go negative
/// with no overdraft limit has no determinate floor and must be refused — at open and at update alike.
/// Kept as a pure static policy (not a method on <see cref="Account"/>) so both the Open and Update handlers
/// can validate a candidate combination before any aggregate state changes.
/// </summary>
public static class AccountFloorPolicy
{
    /// <summary>
    /// True when the combination has no determinate floor: permitted to go negative but no overdraft limit
    /// stated (R3, <c>OVERDRAFT_LIMIT_REQUIRED</c>).
    /// </summary>
    public static bool RequiresOverdraftLimit(bool permittedToGoNegative, decimal? overdraftLimit) =>
        permittedToGoNegative && overdraftLimit is null;

    /// <summary>
    /// The most restrictive floor for the given controls (R2). Callers must have already rejected the
    /// combination via <see cref="RequiresOverdraftLimit"/> — this throws if called with a floor-less
    /// combination.
    /// </summary>
    public static decimal Floor(bool permittedToGoNegative, decimal? overdraftLimit, decimal? minimumBalance)
    {
        if (RequiresOverdraftLimit(permittedToGoNegative, overdraftLimit))
        {
            throw new InvalidOperationException(
                "An account permitted to go negative with no overdraft limit has no determinate floor.");
        }

        return permittedToGoNegative
            ? Math.Max(-overdraftLimit!.Value, minimumBalance ?? decimal.MinValue)
            : Math.Max(0m, minimumBalance ?? 0m);
    }
}

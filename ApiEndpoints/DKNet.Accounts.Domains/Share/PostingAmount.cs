namespace DKNet.Accounts.Domains.Share;

/// <summary>
/// The outcome of checking a candidate posting amount against a currency's decimal places.
/// </summary>
public enum PostingAmountValidation
{
    Valid,
    NotPositive,
    PrecisionExceeded
}

/// <summary>
/// Validation entry point for a posting amount: it must be strictly positive and must never carry more
/// decimal places than its currency permits.
/// </summary>
public static class PostingAmount
{
    /// <summary>
    /// The largest magnitude any stored amount may hold (DRK-1719 R2): every money column is
    /// <c>numeric(18,6)</c>, so 12 whole digits and 6 decimal places. A write that would store more is refused,
    /// never rounded or left to overflow.
    /// </summary>
    public const decimal Ceiling = 999_999_999_999.999999m;

    public static PostingAmountValidation Validate(decimal amount, int decimalPlaces)
    {
        if (amount <= 0m)
        {
            return PostingAmountValidation.NotPositive;
        }

        return HasAtMostPlaces(amount, decimalPlaces)
            ? PostingAmountValidation.Valid
            : PostingAmountValidation.PrecisionExceeded;
    }

    /// <summary>True when <paramref name="amount"/> carries no more significant decimal places than
    /// <paramref name="decimalPlaces"/> — trailing zeros do not count (10.50 has 1).</summary>
    public static bool HasAtMostPlaces(decimal amount, int decimalPlaces) =>
        decimal.Round(amount, decimalPlaces) == amount;

    /// <summary>True when <paramref name="amount"/> is further from zero than <see cref="Ceiling"/>.</summary>
    public static bool ExceedsCeiling(decimal amount) => Math.Abs(amount) > Ceiling;
}

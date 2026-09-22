namespace DKNet.Accounts.AppServices.Share;

/// <summary>
/// Stable machine-readable codes (§3 row 11) for the business-rule refusals this stage can produce. Attached
/// to a <see cref="FluentResults.Error"/> via <c>.WithMetadata(LedgerErrors.CodeKey, ...)</c> so DKNet
/// 11.0.0's own error-response mapping reads it as a command failure's stable code (DRK-1522 §3 row 3) and
/// surfaces it inside the response body's <c>errors[].code</c> entry.
/// </summary>
public static class LedgerErrors
{
    /// <summary>The <see cref="FluentResults.Error.Metadata"/> key carrying the stable code — must match
    /// "Code" exactly (capital C): DKNet 11.0.0 reads a command failure's code from that ordinal metadata
    /// entry (DRK-1522 §3 row 3).</summary>
    public const string CodeKey = "Code";

    public const string OverdraftLimitRequired = "OVERDRAFT_LIMIT_REQUIRED";
    public const string AccountHoldsBalance = "ACCOUNT_HOLDS_BALANCE";
    public const string GroupHoldsBalance = "GROUP_HOLDS_BALANCE";
    public const string GroupNotEmpty = "GROUP_NOT_EMPTY";
    public const string DuplicateGroupCode = "DUPLICATE_GROUP_CODE";
    public const string DuplicateCurrencyCode = "DUPLICATE_CURRENCY_CODE";
    public const string UnsupportedCurrency = "UNSUPPORTED_CURRENCY";

    public const string InvalidPostingAmount = "INVALID_POSTING_AMOUNT";
    public const string CurrencyMismatch = "CURRENCY_MISMATCH";
    public const string EffectiveDateInFuture = "EFFECTIVE_DATE_IN_FUTURE";
    public const string InsufficientFunds = "INSUFFICIENT_FUNDS";
    public const string AccountClosed = "ACCOUNT_CLOSED";
    public const string AccountFrozen = "ACCOUNT_FROZEN";
    public const string AccountDormantDebitRefused = "ACCOUNT_DORMANT_DEBIT_REFUSED";
    public const string PostingAlreadyReversed = "POSTING_ALREADY_REVERSED";
    public const string IdempotencyKeyConflict = "IDEMPOTENCY_KEY_CONFLICT";
    public const string LockTimeout = "LOCK_TIMEOUT";
    public const string InvalidDateRange = "INVALID_DATE_RANGE";

    /// <summary>The <see cref="FluentResults.Success"/> metadata key marking a successful result as an
    /// idempotent replay (the original outcome returned, nothing new recorded) — the API layer reads this to
    /// return 200, not 201 Created, for a replayed request.</summary>
    public const string ReplayedKey = "replayed";

    /// <summary>Builds a failed <see cref="FluentResults.Result{T}"/> carrying <paramref name="code"/> as
    /// stable metadata alongside the human-readable <paramref name="message"/>.</summary>
    public static Error Error(string code, string message) => new FluentResults.Error(message)
        .WithMetadata(CodeKey, code);

    /// <summary>Wraps <paramref name="value"/> as a successful result flagged as an idempotent replay — see
    /// <see cref="ReplayedKey"/>.</summary>
    public static Result<T> Replayed<T>(T value) =>
        Result.Ok(value).WithSuccess(new Success("Idempotent replay of a previously recorded request.")
            .WithMetadata(ReplayedKey, true));

    /// <summary>True when <paramref name="result"/> is a successful idempotent replay (see
    /// <see cref="ReplayedKey"/>) rather than a newly recorded outcome.</summary>
    public static bool IsReplayed(this IResultBase result) =>
        result.Successes.Any(s => s.Metadata.ContainsKey(ReplayedKey));
}

namespace DKNet.Accounts.AppServices.Share;

/// <summary>
/// Stable machine-readable codes (§3 row 11) for the business-rule refusals this stage can produce. Attached
/// to a <see cref="FluentResults.Error"/> via <c>.WithMetadata(LedgerErrors.CodeKey, ...)</c> so the API layer's
/// response mapping can surface a stable <c>code</c> extension on the problem+json body.
/// </summary>
public static class LedgerErrors
{
    /// <summary>The <see cref="FluentResults.Error.Metadata"/> key carrying the stable code.</summary>
    public const string CodeKey = "code";

    public const string OverdraftLimitRequired = "OVERDRAFT_LIMIT_REQUIRED";
    public const string AccountHoldsBalance = "ACCOUNT_HOLDS_BALANCE";
    public const string GroupHoldsBalance = "GROUP_HOLDS_BALANCE";
    public const string GroupCycle = "GROUP_CYCLE";
    public const string DuplicateGroupCode = "DUPLICATE_GROUP_CODE";
    public const string UnsupportedCurrency = "UNSUPPORTED_CURRENCY";

    /// <summary>Builds a failed <see cref="FluentResults.Result{T}"/> carrying <paramref name="code"/> as
    /// stable metadata alongside the human-readable <paramref name="message"/>.</summary>
    public static Error Error(string code, string message) => new FluentResults.Error(message)
        .WithMetadata(CodeKey, code);
}

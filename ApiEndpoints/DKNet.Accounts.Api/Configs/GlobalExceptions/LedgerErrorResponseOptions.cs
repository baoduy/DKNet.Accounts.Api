using DKNet.AspCore.Extensions.Responses;

namespace DKNet.Accounts.Api.Configs.GlobalExceptions;

/// <summary>
/// This service's one and only <see cref="ErrorResponseOptions"/> registration (§3 row 6; <c>AddErrorResponses</c>
/// may only be called once — a second call silently discards whichever call registered first): a
/// FluentValidation refusal carrying one of <see cref="LedgerErrors"/>'s own codes (set via <c>.WithErrorCode</c>)
/// answers 422 and puts that code on the response body's <c>code</c> extension (R1) — giving every route whose
/// validator dispatches through the package's own auto-validation filter (account-group create/close) the same
/// shape <see cref="LedgerResultResponseExtensions"/> already gives the hand-mapped account/posting/currency
/// routes. Any other refusal — including every FluentValidation shape rule, whose <c>ErrorCode</c> is the
/// validator's own name (e.g. <c>NotEmptyValidator</c>), never one of these codes — keeps today's status and
/// carries no code (R1, R3). This describes the validation path only: <see cref="StatusCode"/>/<see cref="Customize"/>
/// also run for a failed FluentResults command (<see cref="ErrorSource.Command"/>), but that path is inert for a
/// <see cref="LedgerErrors"/> code today — see remarks.
/// </summary>
/// <remarks>
/// The package reads a command failure's code from its error's <c>"Code"</c> metadata entry (capital C); every
/// <see cref="LedgerErrors"/> code in this codebase is instead stamped via <see cref="LedgerErrors.Error"/>
/// under <see cref="LedgerErrors.CodeKey"/> ("code", lowercase — read by <see cref="LedgerResultResponseExtensions"/>'s
/// own <c>FindCode</c> for every hand-mapped route instead), and <c>FluentResults.Error.Metadata</c> is an
/// ordinal dictionary, so the two never match: a command failure carrying a stable code would reach this
/// options instance with <c>Code</c> null and fall through to today's default status, never 422. No route in
/// this service routes a coded command failure through the package's native <c>.Response()</c> today (Rename/
/// ChangeDescription/ChangeMetadata only ever fail with an uncoded <c>NotFoundError</c>), so nothing currently
/// depends on this — flagging it rather than realigning <see cref="LedgerErrors.CodeKey"/> itself, which also
/// names the JSON extension property every existing test asserts on and is shared by every other slice.
/// </remarks>
internal static class LedgerErrorResponseOptions
{
    /// <summary>
    /// Every <see cref="LedgerErrors"/> code that answers 422 — every stable code except
    /// <see cref="LedgerErrors.IdempotencyKeyConflict"/>, which keeps its own 409 override in
    /// <see cref="LedgerResultResponseExtensions"/> (a hand-mapped-route-only code today; a second registration
    /// here would just be dead weight, and mapping it to 422 here would contradict that 409). Exposed
    /// internally so <c>AccountGroupsV1Endpoint</c>'s hand-mapped close route can check a validator failure's
    /// own <c>ErrorCode</c> the same way, and so a test can assert this set stays exactly "every LedgerErrors
    /// code but that one" as new codes are added.
    /// </summary>
    internal static readonly IReadOnlySet<string> KnownCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        LedgerErrors.OverdraftLimitRequired,
        LedgerErrors.AccountHoldsBalance,
        LedgerErrors.GroupHoldsBalance,
        LedgerErrors.GroupNotEmpty,
        LedgerErrors.DuplicateGroupCode,
        LedgerErrors.UnsupportedCurrency,
        LedgerErrors.InvalidPostingAmount,
        LedgerErrors.CurrencyMismatch,
        LedgerErrors.EffectiveDateInFuture,
        LedgerErrors.InsufficientFunds,
        LedgerErrors.AccountClosed,
        LedgerErrors.AccountFrozen,
        LedgerErrors.AccountDormantDebitRefused,
        LedgerErrors.PostingAlreadyReversed,
        LedgerErrors.LockTimeout
    };

    internal static bool IsKnownCode(string? code) => code is not null && KnownCodes.Contains(code);

    public static int? StatusCode(ErrorResponseContext context) =>
        context.Errors.Any(e => IsKnownCode(e.Code))
            ? (int)HttpStatusCode.UnprocessableEntity
            : null;

    public static void Customize(ProblemDetails problem, ErrorResponseContext context)
    {
        var code = context.Errors.Select(e => e.Code).FirstOrDefault(IsKnownCode);
        if (code is not null)
        {
            problem.Extensions[LedgerErrors.CodeKey] = code;
        }
    }
}

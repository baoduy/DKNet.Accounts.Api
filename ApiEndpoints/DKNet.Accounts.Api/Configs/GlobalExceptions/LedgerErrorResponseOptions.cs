using DKNet.AspCore.Extensions.Responses;

namespace DKNet.Accounts.Api.Configs.GlobalExceptions;

/// <summary>
/// This service's <see cref="ErrorResponseOptions"/> setting (§3 row 6): a refusal carrying one of
/// <see cref="LedgerErrors"/>'s own codes answers 422 and puts that code on the response body's <c>code</c>
/// extension (R1) — giving routes that dispatch through the package's own <c>.Response()</c>/<c>MapActionById</c>
/// (account-group create/close/activate) the same shape <see cref="LedgerResultResponseExtensions"/> already
/// gives the hand-mapped account/posting/currency routes. Any other failure — including every FluentValidation
/// shape refusal, whose <c>ErrorCode</c> is the validator's own name (e.g. <c>NotEmptyValidator</c>), never one
/// of these codes — keeps today's status and carries no code (R1, R3).
/// </summary>
internal static class LedgerErrorResponseOptions
{
    private static readonly IReadOnlySet<string> KnownCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        LedgerErrors.OverdraftLimitRequired,
        LedgerErrors.AccountHoldsBalance,
        LedgerErrors.GroupHoldsBalance,
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
        LedgerErrors.IdempotencyKeyConflict,
        LedgerErrors.LockTimeout
    };

    public static int? StatusCode(ErrorResponseContext context) =>
        context.Errors.Any(e => e.Code is not null && KnownCodes.Contains(e.Code))
            ? (int)HttpStatusCode.UnprocessableEntity
            : null;

    public static void Customize(ProblemDetails problem, ErrorResponseContext context)
    {
        var code = context.Errors.Select(e => e.Code).FirstOrDefault(c => c is not null && KnownCodes.Contains(c));
        if (code is not null)
        {
            problem.Extensions[LedgerErrors.CodeKey] = code;
        }
    }
}

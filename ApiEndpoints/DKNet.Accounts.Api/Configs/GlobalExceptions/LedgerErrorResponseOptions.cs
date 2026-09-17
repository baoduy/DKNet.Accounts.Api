using Microsoft.AspNetCore.Diagnostics;
using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.Api.Configs.GlobalExceptions;

/// <summary>
/// This service's one and only <see cref="ErrorResponseOptions"/> registration (§3 row 6; <c>AddErrorResponses</c>
/// may only be called once — a second call silently discards whichever call registered first): a business-rule
/// refusal — whether a failed FluentResults command (<see cref="ErrorSource.Command"/>) or a FluentValidation
/// input refusal (<see cref="ErrorSource.Validation"/>) carrying one of <see cref="LedgerErrors"/>'s own codes —
/// answers 422 (409 for <see cref="LedgerErrors.IdempotencyKeyConflict"/>); DKNet 11.0.0 itself already places
/// that code on the response body's <c>errors[].code</c> entry (R1), so no <c>Customize</c> callback is needed
/// here. <see cref="UnhandledError"/> carries this service's own unhandled-exception shaping (DRK-1522 §3 row
/// 8) into the same one registration, replacing the second <c>IExceptionHandler</c> this service used to run.
/// </summary>
internal static class LedgerErrorResponseOptions
{
    private const string GenericUnhandledMessage =
        "An unexpected error occurred. Quote the trace-id when reporting this.";

    /// <summary>
    /// Every <see cref="LedgerErrors"/> code that carries a documented status: every stable code answers 422
    /// except <see cref="LedgerErrors.IdempotencyKeyConflict"/>, which answers 409 (see <see cref="StatusCode"/>).
    /// Exposed internally so a test can assert this set stays exactly "every LedgerErrors code" as new codes
    /// are added.
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
        LedgerErrors.LockTimeout,
        LedgerErrors.IdempotencyKeyConflict
    };

    internal static bool IsKnownCode(string? code) => code is not null && KnownCodes.Contains(code);

    public static int? StatusCode(ErrorResponseContext context)
    {
        if (context.Errors.Any(e => e.Code == LedgerErrors.IdempotencyKeyConflict))
        {
            return (int)HttpStatusCode.Conflict;
        }

        return context.Errors.Any(e => IsKnownCode(e.Code))
            ? (int)HttpStatusCode.UnprocessableEntity
            : null;
    }

    /// <summary>
    /// Carries GlobalExceptionHandler's three special cases over (DRK-1522 §3 row 8): a refused write is a
    /// controlled 403, not an internal error; Kestrel's own transport-level refusals keep their own status;
    /// a unique-index violation is a conflict, not a server fault. Every other exception falls to a fixed,
    /// non-disclosing message outside Development — <paramref name="isDevelopment"/> is captured once at
    /// startup (<c>FluentValidationConfig</c>) since <see cref="ErrorResponseContext"/> carries no
    /// <c>HttpContext</c> to resolve it from.
    /// </summary>
    public static ProblemDetails UnhandledError(ErrorResponseContext context, bool isDevelopment)
    {
        var exception = context.Exception!;
        return exception switch
        {
            OwnershipRequiredException => Problem(
                (int)HttpStatusCode.Forbidden, "Request refused.", exception.Message, exception, isDevelopment),

            // Kestrel's own transport-level refusals (e.g. request body over MaxRequestBodySize → 413) carry
            // their own correct status code.
            BadHttpRequestException badRequest => Problem(
                badRequest.StatusCode, "Request refused.", badRequest.Message, exception, isDevelopment),

            // A unique-index violation surfaces here because SaveChanges runs after the handler returns
            // (DKNet's SlimBus EF Core interceptor auto-saves) — a concurrent duplicate is a conflict, not a
            // server fault.
            DbUpdateException dbUpdate when IsUniqueConstraintViolation(dbUpdate) => Problem(
                (int)HttpStatusCode.Conflict, "Request refused.",
                "The request conflicts with an existing record.", exception, isDevelopment),

            _ => Problem(
                (int)HttpStatusCode.InternalServerError, "Something went wrong!.",
                isDevelopment ? exception.Message : GenericUnhandledMessage, exception, isDevelopment)
        };
    }

    private static ProblemDetails Problem(int status, string title, string message, Exception exception, bool isDevelopment)
    {
        var problem = new ProblemDetails
        {
            Title = title,
            Status = status,
            // The type-nulling outside Development applied to every exception-originated response, not only
            // the generic 500 one — preserved here the same way.
            Type = isDevelopment ? exception.GetType().Name : null
        };
        problem.Extensions["errors"] = new[] { new ErrorItem(message) };
        return problem;
    }

    /// <summary>
    /// Provider-agnostic heuristic (no provider-specific exception type referenced here — Npgsql in
    /// production, EF Core InMemory in tests): a save failure whose innermost exception mentions a duplicate
    /// key or unique-constraint violation is a conflict, not a fault.
    /// </summary>
    private static bool IsUniqueConstraintViolation(DbUpdateException exception)
    {
        var innermost = exception.InnerException?.Message ?? exception.Message;
        return innermost.Contains("unique", StringComparison.OrdinalIgnoreCase) ||
               innermost.Contains("duplicate", StringComparison.OrdinalIgnoreCase);
    }
}

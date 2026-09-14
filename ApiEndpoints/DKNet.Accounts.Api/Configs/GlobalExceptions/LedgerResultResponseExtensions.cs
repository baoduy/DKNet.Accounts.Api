using DKNet.AspCore.Extensions.Responses;

namespace DKNet.Accounts.Api.Configs.GlobalExceptions;

/// <summary>
/// This service's own FluentResults → HTTP mapping for the account-group and account routes (§5): a
/// business-rule refusal is <c>422 Unprocessable Entity</c>, not <see cref="DKNet.AspCore.Extensions.Responses.ResultResponseExtensions"/>'s
/// package default of 400 — a not-found result still becomes 404 (that special-case lives in the underlying
/// <c>ToProblemDetails</c> call and is preserved here). Also promotes any <see cref="LedgerErrors.CodeKey"/>
/// error metadata onto the response body's <c>code</c> extension (§3 row 11).
/// </summary>
internal static class LedgerResultResponseExtensions
{
    public static IResult ToLedgerResponse<T>(this IResult<T> result, bool isCreated = false)
    {
        ArgumentNullException.ThrowIfNull(result);

        if (!result.IsSuccess)
        {
            return TypedResults.Problem(WithCode(result, result.ToProblemDetails(HttpStatusCode.UnprocessableEntity))!);
        }

        if (isCreated)
        {
            return TypedResults.Created("/", result.Value);
        }

        return result.ValueOrDefault is null ? TypedResults.Ok() : TypedResults.Json(result.Value);
    }

    private static ProblemDetails? WithCode(IResultBase result, ProblemDetails? problem)
    {
        if (problem is null)
        {
            return null;
        }

        var code = result.Errors
            .Select(e => e.Metadata.TryGetValue(LedgerErrors.CodeKey, out var value) ? value as string : null)
            .FirstOrDefault(c => c is not null);

        if (code is not null)
        {
            problem.Extensions[LedgerErrors.CodeKey] = code;
        }

        return problem;
    }
}

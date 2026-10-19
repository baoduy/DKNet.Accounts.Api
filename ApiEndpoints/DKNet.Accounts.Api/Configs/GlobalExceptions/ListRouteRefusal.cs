using DKNet.AspCore.Extensions.Responses;
using FluentValidation.Results;

namespace DKNet.Accounts.Api.Configs.GlobalExceptions;

/// <summary>
/// The refusal a list route answers when it runs its query validator by hand (DRK-2304): the auto-validation
/// endpoint filter never sees a query assembled inside the route body, so both <c>GET /v1/postings</c> and the
/// account transfer list build the body here instead. Only a <see cref="LedgerErrors"/> code reaches
/// <c>errors[].code</c>, the status is <see cref="LedgerErrorResponseOptions.StatusCode"/>'s (else 400), and
/// <c>type</c> is the final status' own name — the same rule DKNet's internal <c>ErrorProblemFactory</c>
/// applies on the shared path (docs/api-contract.md:277-278).
/// </summary>
internal static class ListRouteRefusal
{
    public static IResult ToRefusal(this ValidationResult validation)
    {
        var errors = validation.Errors
            .Select(e => new ErrorItem(
                e.ErrorMessage, LedgerErrorResponseOptions.IsKnownCode(e.ErrorCode) ? e.ErrorCode : null,
                e.PropertyName))
            .ToArray();
        var errorContext = new ErrorResponseContext { Source = ErrorSource.Validation, Errors = errors };
        var status = LedgerErrorResponseOptions.StatusCode(errorContext) ?? StatusCodes.Status400BadRequest;
        var problem = new ProblemDetails
        {
            Title = "Request refused.",
            Status = status,
            Type = ((HttpStatusCode)status).ToString()
        };
        problem.Extensions["errors"] = errors;
        return Results.Problem(problem);
    }
}

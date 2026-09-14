using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.Api.Configs.GlobalExceptions;

internal sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    IHostEnvironment environment,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    private const string GenericDetail = "An unexpected error occurred. Quote the trace-id when reporting this.";

    #region Methods

    public ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Unhandled exception on {Method} {Path}", httpContext.Request.Method,
            httpContext.Request.Path);

        var isDevelopment = environment.IsDevelopment();

        // A refused write is a controlled 403, not an internal error — never leak EF Core detail for it.
        var problem = exception switch
        {
            OwnershipRequiredException => new ProblemDetails
            {
                Status = (int)HttpStatusCode.Forbidden,
                Title = "Request refused.",
                Detail = exception.Message,
                Type = exception.GetType().Name
            },

            // Kestrel's own transport-level refusals (e.g. request body over MaxRequestBodySize → 413) carry
            // their own correct status code — without this case they were being swallowed into a generic 500
            // (DRK-1242 §3 row 13), which hid a real, working bound behind a wrong response.
            BadHttpRequestException badRequest => new ProblemDetails
            {
                Status = badRequest.StatusCode,
                Title = "Request refused.",
                Detail = badRequest.Message,
                Type = exception.GetType().Name
            },

            // A unique-index violation surfaces here because SaveChanges runs after the handler returns
            // (DKNet's SlimBus EF Core interceptor auto-saves) — a concurrent duplicate (e.g. two opens racing
            // for the same generated account number, §6) is a conflict, not a server fault.
            DbUpdateException dbUpdate when IsUniqueConstraintViolation(dbUpdate) => new ProblemDetails
            {
                Status = (int)HttpStatusCode.Conflict,
                Title = "Request refused.",
                Detail = "The request conflicts with an existing record.",
                Type = exception.GetType().Name
            },

            _ => new ProblemDetails
            {
                Status = (int)HttpStatusCode.InternalServerError,
                Title = "Something went wrong!.",
                Detail = isDevelopment ? exception.Message : GenericDetail,
                Type = isDevelopment ? exception.GetType().Name : null
            }
        };

        // ProblemDetails.Status only shapes the JSON body — the actual response line still needs it set.
        httpContext.Response.StatusCode = problem.Status!.Value;

        return problemDetailsService.TryWriteAsync(
            new ProblemDetailsContext
                { HttpContext = httpContext, ProblemDetails = problem, Exception = exception });
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

    #endregion
}
using FluentValidation.Results;
using Microsoft.AspNetCore.Http.HttpResults;
using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Unit.Configs;

/// <summary>
/// DRK-2304 §6a D9: no list validator emits <see cref="LedgerErrors.IdempotencyKeyConflict"/> today, so the 409
/// arm of <see cref="ListRouteRefusal.ToRefusal"/> is only reachable here. The second failure carries a
/// non-ledger code set explicitly, so the code filter is proven without leaning on the global resolver.
/// </summary>
public class ListRouteRefusalTests
{
    [Fact]
    public void ToRefusal_ForAnIdempotencyKeyConflict_AnswersConflictAndKeepsOnlyTheLedgerCode()
    {
        var validation = new ValidationResult(
        [
            new ValidationFailure("IdempotencyKey", "Key reused.") { ErrorCode = LedgerErrors.IdempotencyKeyConflict },
            new ValidationFailure("Search", "Too short.") { ErrorCode = "MinimumLengthValidator" }
        ]);

        var problem = validation.ToRefusal().ShouldBeOfType<ProblemHttpResult>().ProblemDetails;

        problem.Status.ShouldBe(409);
        problem.Type.ShouldBe("Conflict");
        problem.Title.ShouldBe("Request refused.");
        problem.Extensions["errors"].ShouldBeOfType<ErrorItem[]>().Select(e => e.Code)
            .ShouldBe([LedgerErrors.IdempotencyKeyConflict, null]);
    }
}

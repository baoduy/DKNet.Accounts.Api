using System.Net;
using FluentValidation.Results;
using Microsoft.AspNetCore.Http.HttpResults;
using DKNet.Accounts.Api.ApiEndpoints.AccountGroups;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Unit.ApiEndpoints.AccountGroups;

/// <summary>
/// Direct, HTTP-free coverage of <see cref="AccountGroupsV1Endpoint.CloseValidationFailureResponse"/>'s
/// not-a-known-code branch — unreachable through the real close route today, since
/// <c>CloseAccountGroupRequestValidator</c> carries exactly one rule and it always sets a known code, but the
/// branch exists precisely so a second, uncoded rule added later still falls through to a plain 400 instead
/// of promoting an arbitrary FluentValidation message onto the ledger 422+code shape.
/// </summary>
public class AccountGroupsV1EndpointTests
{
    [Fact]
    public void CloseValidationFailureResponse_WithAKnownCode_PromotesItToTheLedgerShape()
    {
        var validation = new ValidationResult(
        [
            new ValidationFailure("Id", "Cannot close a group while any account it holds still carries a balance.")
            {
                ErrorCode = LedgerErrors.GroupHoldsBalance
            }
        ]);

        var response = AccountGroupsV1Endpoint.CloseValidationFailureResponse(validation);

        var problem = response.ShouldBeOfType<ProblemHttpResult>();
        problem.StatusCode.ShouldBe((int)HttpStatusCode.UnprocessableEntity);
        problem.ProblemDetails.Extensions[LedgerErrors.CodeKey].ShouldBe(LedgerErrors.GroupHoldsBalance);
    }

    [Fact]
    public void CloseValidationFailureResponse_WithNoKnownCode_FallsThroughToAPlainValidationProblem()
    {
        var validation = new ValidationResult(
        [
            new ValidationFailure("Id", "Some other rule failed.") { ErrorCode = "SomeOtherRule" }
        ]);

        var response = AccountGroupsV1Endpoint.CloseValidationFailureResponse(validation);

        var problem = response.ShouldBeOfType<ProblemHttpResult>();
        problem.StatusCode.ShouldBe((int)HttpStatusCode.BadRequest);
        problem.ProblemDetails.Extensions.ShouldNotContainKey(LedgerErrors.CodeKey);
    }
}

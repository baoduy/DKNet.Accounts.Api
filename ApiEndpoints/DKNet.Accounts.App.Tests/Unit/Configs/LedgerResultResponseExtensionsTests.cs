using FluentResults;
using Microsoft.AspNetCore.Http.HttpResults;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Unit.Configs;

/// <summary>
/// Direct, HTTP-free coverage of <see cref="LedgerResultResponseExtensions"/>'s branches that the endpoint
/// integration tests don't reach through a real handler: a successful result carrying a null value (no handler
/// in this service returns one today, but the extension supports it), and a failure with no <c>code</c>
/// metadata attached (e.g. the "caller is not authenticated" result, which is a plain string error).
/// </summary>
public class LedgerResultResponseExtensionsTests
{
    [Fact]
    public void Success_WithNonNullValue_ReturnsJsonOfTheValue()
    {
        var result = Result.Ok("value");

        var response = result.ToLedgerResponse();

        var json = response.ShouldBeOfType<JsonHttpResult<string>>();
        json.Value.ShouldBe("value");
    }

    [Fact]
    public void Success_WithNullValue_ReturnsOkWithNoBody()
    {
        var result = Result.Ok<string?>(null);

        var response = result.ToLedgerResponse();

        response.ShouldBeOfType<Ok>();
    }

    [Fact]
    public void Success_WithIsCreated_ReturnsCreatedWithTheValue()
    {
        var result = Result.Ok("value");

        var response = result.ToLedgerResponse(isCreated: true);

        var created = response.ShouldBeOfType<Created<string>>();
        created.Value.ShouldBe("value");
    }

    [Fact]
    public void Failure_WithNoCodeMetadata_ReturnsProblemWithoutACodeExtension()
    {
        var result = Result.Fail<string>("The caller is not authenticated.");

        var response = result.ToLedgerResponse();

        var problem = response.ShouldBeOfType<ProblemHttpResult>();
        problem.StatusCode.ShouldBe((int)HttpStatusCode.UnprocessableEntity);
        problem.ProblemDetails.Extensions.ShouldNotContainKey(LedgerErrors.CodeKey);
    }

    [Fact]
    public void Failure_WithCodeMetadata_PromotesItOntoTheProblemBody()
    {
        var result = Result.Fail<string>(LedgerErrors.Error(LedgerErrors.DuplicateGroupCode, "duplicate"));

        var response = result.ToLedgerResponse();

        var problem = response.ShouldBeOfType<ProblemHttpResult>();
        problem.ProblemDetails.Extensions[LedgerErrors.CodeKey].ShouldBe(LedgerErrors.DuplicateGroupCode);
    }
}

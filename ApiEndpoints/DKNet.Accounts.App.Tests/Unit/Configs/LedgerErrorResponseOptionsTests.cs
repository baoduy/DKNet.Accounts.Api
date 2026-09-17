using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.Share;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Unit.Configs;

/// <summary>
/// Parity check for <see cref="LedgerErrorResponseOptions.KnownCodes"/>, hand-restated rather than reflected.
/// This test is what makes an unlisted new code loud instead of silent: adding one to <see cref="LedgerErrors"/>
/// without deciding whether it belongs here fails this test, rather than leaving <c>KnownCodes</c> quietly out
/// of date. DRK-1522 §3 row 4: <see cref="LedgerErrors.IdempotencyKeyConflict"/> now sits in the same set as
/// every other code — <see cref="LedgerErrorResponseOptions.StatusCode"/> alone decides it answers 409 instead
/// of 422, so a second, separate set would just be dead weight.
/// </summary>
public class LedgerErrorResponseOptionsTests
{
    [Fact]
    public void KnownCodes_IsEveryLedgerErrorsCode()
    {
        var everyCode = typeof(LedgerErrors)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(f => f.IsLiteral && f.FieldType == typeof(string))
            .Select(f => (string)f.GetRawConstantValue()!)
            .Where(c => c != LedgerErrors.CodeKey && c != LedgerErrors.ReplayedKey);

        LedgerErrorResponseOptions.KnownCodes.ShouldBe(everyCode, ignoreOrder: true);
    }

    [Fact]
    public void StatusCode_ForIdempotencyKeyConflict_Is409NotThe422EveryOtherKnownCodeGets()
    {
        // A second, unrelated error alongside the conflict one: only Any (not All) of the errors carrying
        // the idempotency code should decide the status.
        var context = new ErrorResponseContext
        {
            Source = ErrorSource.Command,
            Errors = [new ErrorItem("unrelated", null), new ErrorItem("conflict", LedgerErrors.IdempotencyKeyConflict)]
        };

        LedgerErrorResponseOptions.StatusCode(context).ShouldBe((int)HttpStatusCode.Conflict);
    }

    [Fact]
    public void StatusCode_WhenOnlySomeErrorsCarryAKnownCode_IsStill422()
    {
        // Any (not All) of the errors carrying a known code should decide 422 — a mixed list must still
        // trip the 422 branch.
        var context = new ErrorResponseContext
        {
            Source = ErrorSource.Command,
            Errors = [new ErrorItem("unrelated", null), new ErrorItem("known", LedgerErrors.DuplicateGroupCode)]
        };

        LedgerErrorResponseOptions.StatusCode(context).ShouldBe((int)HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public void StatusCode_WhenNoErrorCarriesAKnownCode_IsNull()
    {
        var context = new ErrorResponseContext
        {
            Source = ErrorSource.Command,
            Errors = [new ErrorItem("unrelated", null)]
        };

        LedgerErrorResponseOptions.StatusCode(context).ShouldBeNull();
    }

    private static ErrorResponseContext UnhandledContextFor(Exception exception) => new()
    {
        Source = ErrorSource.Unhandled,
        Errors = [],
        Exception = exception
    };

    // No ambient HttpContext: exercises LedgerErrorResponseOptions.UnhandledError's own body-shaping directly,
    // same as every test below did before row 6 added logging. LedgerErrorResponseOptionsLoggingTests covers
    // the logging behaviour itself, through a real HttpContext.
    private static readonly IHttpContextAccessor NoHttpContext = new HttpContextAccessor();

    private static ProblemDetails UnhandledError(Exception exception, bool isDevelopment) =>
        LedgerErrorResponseOptions.UnhandledError(UnhandledContextFor(exception), isDevelopment, NoHttpContext);

    /// <summary>
    /// Reproduced directly, not exercised over HTTP: ASP.NET Core's own <c>UseDeveloperExceptionPage()</c>
    /// (auto-added ahead of anything an <c>IStartupFilter</c> contributes whenever the environment reports
    /// Development) answers an unhandled exception itself before <see cref="LedgerErrorResponseOptions.UnhandledError"/>
    /// ever runs — see <c>GlobalExceptionHandlerHttpTests</c>'s remarks. This is the only way left to prove
    /// the Development branch itself.
    /// </summary>
    [Fact]
    public void UnhandledError_InDevelopment_DisclosesTheThrownExceptionMessageAndType()
    {
        var exception = new InvalidOperationException("boom");

        var problem = UnhandledError(exception, true);

        ((ErrorItem[])problem.Extensions["errors"]!)[0].Message.ShouldBe("boom");
        problem.Type.ShouldBe(nameof(InvalidOperationException));
    }

    [Fact]
    public void UnhandledError_InDevelopment_NeverExposesTheInnerExceptionText()
    {
        var inner = new Exception("inner secret data");
        var outer = new InvalidOperationException("outer boom", inner);

        var problem = UnhandledError(outer, true);

        ((ErrorItem[])problem.Extensions["errors"]!)[0].Message.ShouldBe("outer boom");
    }

    [Fact]
    public void UnhandledError_OutsideDevelopment_DisclosesNeitherMessageNorType()
    {
        var exception = new InvalidOperationException("boom");

        var problem = UnhandledError(exception, false);

        ((ErrorItem[])problem.Extensions["errors"]!)[0].Message.ShouldNotBe("boom");
        problem.Type.ShouldBeNull();
    }

    /// <summary>
    /// The type-nulling outside Development applies to every exception-originated response, not only the
    /// generic 500 one (GlobalExceptionConfigs' own original guard, carried over) — <c>OwnershipRequiredException</c>
    /// picked as one representative of the three named-exception branches.
    /// </summary>
    [Fact]
    public void UnhandledError_InDevelopment_ExposesTypeForANamedExceptionBranchToo()
    {
        var problem = UnhandledError(new OwnershipRequiredException(), true);

        problem.Type.ShouldBe(nameof(OwnershipRequiredException));
    }

    public static IEnumerable<object[]> NamedExceptionBranches()
    {
        yield return [new OwnershipRequiredException()];
        yield return [new BadHttpRequestException("bad request", 400)];
        yield return [new DbUpdateException("Saving changes failed.", new Exception("duplicate key value violates unique constraint"))];
    }

    [Theory]
    [MemberData(nameof(NamedExceptionBranches))]
    public void UnhandledError_ForANamedExceptionBranch_TitleIsRequestRefused(Exception exception)
    {
        var problem = UnhandledError(exception, false);

        problem.Title.ShouldBe("Request refused.");
    }

    [Fact]
    public void UnhandledError_Generic_TitleIsSomethingWentWrong()
    {
        var problem = UnhandledError(new Exception("boom"), false);

        problem.Title.ShouldBe("Something went wrong!.");
    }

    [Fact]
    public void UnhandledError_DbUpdateException_WithOnlyUniqueNamedNotDuplicate_Returns409()
    {
        // Isolates the branch's guard from an "and" rather than an "or": a message naming "unique" alone
        // (never "duplicate") must still trip the conflict branch.
        var inner = new Exception("unique constraint violation on IX_Accounts_AccountNumber");
        var outer = new DbUpdateException("Saving changes failed.", inner);

        var problem = UnhandledError(outer, false);

        problem.Status.ShouldBe((int)HttpStatusCode.Conflict);
    }

    [Fact]
    public void UnhandledError_DbUpdateException_WithOnlyDuplicateNamedNotUnique_Returns409()
    {
        var inner = new Exception("duplicate row rejected");
        var outer = new DbUpdateException("Saving changes failed.", inner);

        var problem = UnhandledError(outer, false);

        problem.Status.ShouldBe((int)HttpStatusCode.Conflict);
    }
}

using System.Reflection;
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
        var context = new ErrorResponseContext
        {
            Source = ErrorSource.Command,
            Errors = [new ErrorItem("conflict", LedgerErrors.IdempotencyKeyConflict)]
        };

        LedgerErrorResponseOptions.StatusCode(context).ShouldBe((int)HttpStatusCode.Conflict);
    }

    private static ErrorResponseContext UnhandledContextFor(Exception exception) => new()
    {
        Source = ErrorSource.Unhandled,
        Errors = [],
        Exception = exception
    };

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

        var problem = LedgerErrorResponseOptions.UnhandledError(UnhandledContextFor(exception), isDevelopment: true);

        ((ErrorItem[])problem.Extensions["errors"]!)[0].Message.ShouldBe("boom");
        problem.Type.ShouldBe(nameof(InvalidOperationException));
    }

    [Fact]
    public void UnhandledError_InDevelopment_NeverExposesTheInnerExceptionText()
    {
        var inner = new Exception("inner secret data");
        var outer = new InvalidOperationException("outer boom", inner);

        var problem = LedgerErrorResponseOptions.UnhandledError(UnhandledContextFor(outer), isDevelopment: true);

        ((ErrorItem[])problem.Extensions["errors"]!)[0].Message.ShouldBe("outer boom");
    }

    [Fact]
    public void UnhandledError_OutsideDevelopment_DisclosesNeitherMessageNorType()
    {
        var exception = new InvalidOperationException("boom");

        var problem = LedgerErrorResponseOptions.UnhandledError(UnhandledContextFor(exception), isDevelopment: false);

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
        var problem = LedgerErrorResponseOptions.UnhandledError(
            UnhandledContextFor(new OwnershipRequiredException()), isDevelopment: true);

        problem.Type.ShouldBe(nameof(OwnershipRequiredException));
    }
}

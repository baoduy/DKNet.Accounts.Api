namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1522 §5, "The service keeps no hand-written failure conversion": after §3 rows 6-7 the service has
/// exactly one setting shaping every failure response — no hand-written <c>IResult</c>-to-<c>IResult</c>
/// converter, and no second <see cref="Microsoft.AspNetCore.Diagnostics.IExceptionHandler"/> alongside the
/// package's own.
/// </summary>
public sealed class NoHandWrittenFailureConversionTests
{
    private static string GlobalExceptionsDir => Path.GetFullPath(Path.Combine(
        AppContext.BaseDirectory, "../../../../..",
        "ApiEndpoints/DKNet.Accounts.Api/Configs/GlobalExceptions"));

    [Fact]
    public void NoHandWrittenResultToResponseConverterExists()
    {
        File.Exists(Path.Combine(GlobalExceptionsDir, "LedgerResultResponseExtensions.cs")).ShouldBeFalse(
            "LedgerResultResponseExtensions (the hand-written FluentResults -> IResult conversion) should be removed.");
    }

    [Fact]
    public void NoSecondExceptionHandlerExists()
    {
        File.Exists(Path.Combine(GlobalExceptionsDir, "GlobalExceptionHandler.cs")).ShouldBeFalse(
            "GlobalExceptionHandler (a second IExceptionHandler alongside AddErrorResponses' own) should be removed.");
        File.Exists(Path.Combine(GlobalExceptionsDir, "GlobalExceptionConfigs.cs")).ShouldBeFalse(
            "GlobalExceptionConfigs (AddGlobalException/UseGlobalException wiring the second handler) should be removed.");
    }
}

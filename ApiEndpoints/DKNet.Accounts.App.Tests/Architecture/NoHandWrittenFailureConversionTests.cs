using System.Reflection;
using FluentResults;
using Microsoft.AspNetCore.Diagnostics;
using NetArchTest.Rules;
using AspResult = Microsoft.AspNetCore.Http.IResult;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1522 §5, "The service keeps no hand-written failure conversion": after §3 rows 6-7 the service has
/// exactly one setting shaping every failure response — no method converting a command result
/// (<see cref="IResultBase"/>/<see cref="IResult{T}"/>) to an <see cref="AspResult"/>, and no type
/// implementing a second <see cref="IExceptionHandler"/> alongside the package's own. Asserted at the
/// type/method level (reflection over the Api assembly), not by filename — renaming
/// <c>LedgerResultResponseExtensions</c> or <c>GlobalExceptionHandler</c> must not satisfy this.
/// </summary>
public sealed class NoHandWrittenFailureConversionTests
{
    private static readonly Assembly ApiAssembly = typeof(DKNet.Accounts.Api.Program).Assembly;

    private static string GlobalExceptionsDir => Path.GetFullPath(Path.Combine(
        AppContext.BaseDirectory, "../../../../..",
        "ApiEndpoints/DKNet.Accounts.Api/Configs/GlobalExceptions"));

    [Fact]
    public void NoTypeImplementsASecondExceptionHandler()
    {
        var offenders = Types.InAssembly(ApiAssembly)
            .That().ImplementInterface(typeof(IExceptionHandler))
            .GetTypes();

        offenders.ShouldBeEmpty(
            "No type should implement IExceptionHandler — AddErrorResponses registers its own " +
            $"ErrorResponseExceptionHandler. Found: {string.Join(", ", offenders.Select(t => t.FullName))}");
    }

    [Fact]
    public void NoMethodConvertsACommandResultToAResponse()
    {
        const BindingFlags all = BindingFlags.Public | BindingFlags.NonPublic |
                                  BindingFlags.Static | BindingFlags.Instance | BindingFlags.DeclaredOnly;

        var offenders = Types.InAssembly(ApiAssembly)
            .GetTypes()
            .SelectMany(t => t.GetMethods(all))
            .Where(m => typeof(AspResult).IsAssignableFrom(m.ReturnType))
            .Where(m => m.GetParameters().Any(IsCommandResultParameter))
            .Select(m => $"{m.DeclaringType!.FullName}.{m.Name}")
            .ToList();

        offenders.ShouldBeEmpty(
            "No method should convert a command result (IResultBase/IResult<T>) to an IResult — " +
            $"AddErrorResponses' Response()/Response<T>() are the only conversion. Found: {string.Join(", ", offenders)}");
    }

    private static bool IsCommandResultParameter(ParameterInfo parameter) =>
        parameter.ParameterType == typeof(IResultBase) ||
        (parameter.ParameterType.IsGenericType &&
         parameter.ParameterType.GetGenericTypeDefinition() == typeof(IResult<>));

    // Secondary, file-existence assertions (rework note): kept alongside the type-level checks above, which
    // are what a rename can't game — a file surviving under a new name would still trip those.
    [Fact]
    public void NoHandWrittenResultToResponseConverterFileExists()
    {
        File.Exists(Path.Combine(GlobalExceptionsDir, "LedgerResultResponseExtensions.cs")).ShouldBeFalse(
            "LedgerResultResponseExtensions (the hand-written FluentResults -> IResult conversion) should be removed.");
    }

    [Fact]
    public void NoSecondExceptionHandlerFilesExist()
    {
        File.Exists(Path.Combine(GlobalExceptionsDir, "GlobalExceptionHandler.cs")).ShouldBeFalse(
            "GlobalExceptionHandler (a second IExceptionHandler alongside AddErrorResponses' own) should be removed.");
        File.Exists(Path.Combine(GlobalExceptionsDir, "GlobalExceptionConfigs.cs")).ShouldBeFalse(
            "GlobalExceptionConfigs (AddGlobalException/UseGlobalException wiring the second handler) should be removed.");
    }
}

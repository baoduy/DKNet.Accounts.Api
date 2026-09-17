using System.Text.RegularExpressions;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1467 §5: "Activating an account group is served by the generated route set" — reads the literal
/// route names <see cref="DKNet.Accounts.Api.ApiEndpoints.AccountGroups.AccountGroupsV1Endpoint"/> excludes
/// from the generated <c>MapAccountGroupCrud</c> composite. "Close" stays hand-written (its refusal rule runs
/// where a generated route cannot reach it); "Activate" must not.
/// </summary>
public sealed class AccountGroupExcludedRoutesTests
{
    private static string EndpointSourcePath => Path.GetFullPath(Path.Combine(
        AppContext.BaseDirectory, "../../../../..",
        "ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/AccountGroups/AccountGroupsV1Endpoint.cs"));

    private static string[] ExcludedRouteNames()
    {
        var source = File.ReadAllText(EndpointSourcePath);
        var match = Regex.Match(source, @"\.Exclude\(([^)]*)\)");
        match.Success.ShouldBeTrue($"expected an .Exclude(...) call in {EndpointSourcePath}");

        return Regex.Matches(match.Groups[1].Value, "\"([^\"]*)\"")
            .Select(m => m.Groups[1].Value)
            .ToArray();
    }

    [Fact]
    public void ExcludedRouteNames_DoNotIncludeActivate()
    {
        ExcludedRouteNames().ShouldNotContain("Activate");
    }

    [Fact]
    public void ExcludedRouteNames_StillIncludeClose()
    {
        ExcludedRouteNames().ShouldContain("Close");
    }
}

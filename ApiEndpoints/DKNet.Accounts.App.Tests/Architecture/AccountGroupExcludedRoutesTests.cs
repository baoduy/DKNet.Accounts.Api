using System.Text.RegularExpressions;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1467 §5: "Activating an account group is served by the generated route set" — reads the literal
/// route names <see cref="DKNet.Accounts.Api.ApiEndpoints.AccountGroups.AccountGroupsV1Endpoint"/> excludes
/// from the generated <c>MapAccountGroupCrud</c> composite. "Close" stays hand-written (its refusal rule runs
/// where a generated route cannot reach it); "Activate" must not.
///
/// DRK-1522 §3 row 13: "Close" now moves into the generated composite too (its refusal rule moves into a
/// hand-written <c>IHandler</c> instead of a hand-mapped route), so the account-group side excludes nothing
/// by name; <see cref="DKNet.Accounts.Api.ApiEndpoints.Accounts.AccountsV1Endpoint"/> gains its own
/// generated composite excluding only "Delete" (accounts publish no delete route).
/// </summary>
public sealed class AccountGroupExcludedRoutesTests
{
    private static string EndpointSourcePath => Path.GetFullPath(Path.Combine(
        AppContext.BaseDirectory, "../../../../..",
        "ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/AccountGroups/AccountGroupsV1Endpoint.cs"));

    private static string AccountsEndpointSourcePath => Path.GetFullPath(Path.Combine(
        AppContext.BaseDirectory, "../../../../..",
        "ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Accounts/AccountsV1Endpoint.cs"));

    private static string[] ExcludedRouteNames(string sourcePath)
    {
        var source = File.ReadAllText(sourcePath);
        var match = Regex.Match(source, @"\.Exclude\(([^)]*)\)");
        match.Success.ShouldBeTrue($"expected an .Exclude(...) call in {sourcePath}");

        return Regex.Matches(match.Groups[1].Value, "\"([^\"]*)\"")
            .Select(m => m.Groups[1].Value)
            .ToArray();
    }

    [Fact]
    public void ExcludedRouteNames_DoNotIncludeActivate()
    {
        ExcludedRouteNames(EndpointSourcePath).ShouldNotContain("Activate");
    }

    [Fact]
    public void ExcludedRouteNames_NoLongerIncludeClose()
    {
        ExcludedRouteNames(EndpointSourcePath).ShouldNotContain("Close");
    }

    [Fact]
    public void AccountsEndpoint_ExcludedRouteNames_AreExactlyDelete()
    {
        ExcludedRouteNames(AccountsEndpointSourcePath).ShouldBe(["Delete"]);
    }
}

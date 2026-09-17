using System.Text.RegularExpressions;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1467 §5: "Activating an account group is served by the generated route set" — reads the literal
/// route names <see cref="DKNet.Accounts.Api.ApiEndpoints.AccountGroups.AccountGroupsV1Endpoint"/> excludes
/// from the generated <c>MapAccountGroupCrud</c> composite. "Activate" must never be excluded by name.
///
/// DRK-1522 §3 row 13: "Close" moved into the generated composite too (its refusal rule moved into a
/// hand-written <c>IHandler</c> instead of a hand-mapped route), so the account-group side excludes nothing
/// by name; <see cref="DKNet.Accounts.Api.ApiEndpoints.Accounts.AccountsV1Endpoint"/> excludes only "Delete"
/// (accounts publish no delete route). This is spec revision 13 §3, frozen: both entities are served by the
/// generated route set for every route/operation it can serve. pr-reviewer round 1 finding 7 briefly excluded
/// "Close" (account groups) and "GetById"/"Rename"/"ChangeMetadata" (accounts) by name to force an explicit
/// <c>"{id:guid}"</c> pattern each of those routes had before DRK-1522 — that reversed the frozen requirement
/// and was reverted in round 2. Every one of these routes answers a malformed id with 400, not 404 — the
/// generated composite's own default pattern is the looser <c>"{id}"</c> — and that is the accepted, documented
/// behaviour, not a gap.
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

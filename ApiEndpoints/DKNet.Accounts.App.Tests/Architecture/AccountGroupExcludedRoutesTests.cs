using System.Text.RegularExpressions;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1467 §5: "Activating an account group is served by the generated route set" — reads the literal
/// route names <see cref="DKNet.Accounts.Api.ApiEndpoints.AccountGroups.AccountGroupsV1Endpoint"/> excludes
/// from the generated <c>MapAccountGroupCrud</c> composite. "Activate" must never be excluded by name.
///
/// DRK-1522 §3 row 13 moved "Close" into the generated composite's own action set (its refusal rule moved
/// into a hand-written <c>IHandler</c> instead of a hand-mapped route). pr-reviewer round 1 finding 7 excluded
/// it again by name so it could be hand-mapped with an explicit <c>"{id:guid}"</c> pattern (see
/// <see cref="DKNet.Accounts.Api.ApiEndpoints.AccountGroups.AccountGroupsV1Endpoint"/>'s own remarks) — the
/// generated composite's default <c>"{id}"</c> answers a malformed id 400 instead of the 404 this service has
/// always answered. <see cref="DKNet.Accounts.Api.ApiEndpoints.Accounts.AccountsV1Endpoint"/> excludes
/// "Delete" (accounts publish no delete route) plus, for the same reason as Close,
/// "GetById"/"Rename"/"ChangeMetadata".
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

    /// <summary>pr-reviewer round 1 finding 7: Close is excluded again (and hand-mapped with an explicit
    /// "{id:guid}" pattern) rather than left to the generated composite's looser "{id}" default.</summary>
    [Fact]
    public void ExcludedRouteNames_IncludeClose()
    {
        ExcludedRouteNames(EndpointSourcePath).ShouldContain("Close");
    }

    /// <summary>pr-reviewer round 1 finding 7: GetById/Rename/ChangeMetadata join Delete in the exclusion list
    /// so all three can be hand-mapped with an explicit "{id:guid}" pattern.</summary>
    [Fact]
    public void AccountsEndpoint_ExcludedRouteNames_AreExactlyDeleteGetByIdRenameChangeMetadata()
    {
        ExcludedRouteNames(AccountsEndpointSourcePath).ShouldBe(
            ["Delete", "GetById", "Rename", "ChangeMetadata"], ignoreOrder: true);
    }
}

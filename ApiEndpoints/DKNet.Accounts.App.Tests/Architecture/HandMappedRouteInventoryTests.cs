using System.Text.RegularExpressions;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1522 §5, "Only the routes a generated route set cannot serve stay hand-mapped": the account-group and
/// account routes registered directly with <c>group.MapGet/MapPost/MapPatch(...)</c> (i.e. outside the
/// generated <c>MapAccountGroupCrud</c>/<c>MapAccountCrud</c> composites) must be exactly the five the spec
/// names — reading a group's totals per currency, opening an account, changing an account's status/limits,
/// reading an account's balance, and reading an account's statement. "Close" moves into the generated
/// composite by this cycle (§3 row 11), so it must no longer appear in this inventory.
/// </summary>
public sealed class HandMappedRouteInventoryTests
{
    private static string AccountGroupsEndpointSourcePath => Path.GetFullPath(Path.Combine(
        AppContext.BaseDirectory, "../../../../..",
        "ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/AccountGroups/AccountGroupsV1Endpoint.cs"));

    private static string AccountsEndpointSourcePath => Path.GetFullPath(Path.Combine(
        AppContext.BaseDirectory, "../../../../..",
        "ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Accounts/AccountsV1Endpoint.cs"));

    /// <summary>
    /// (HTTP method, route template) for every route this file registers directly via
    /// <c>group.Map(Get|Post|Patch)(...)</c> — a composite's own routes are registered through
    /// <c>.Configure("Name", ...)</c>, which this pattern does not match.
    /// </summary>
    private static IEnumerable<(string Method, string Path)> HandMappedRoutes(string sourcePath) =>
        Regex.Matches(File.ReadAllText(sourcePath), @"group\.Map(Get|Post|Patch)\(\s*""([^""]*)""")
            .Select(m => (Method: m.Groups[1].Value, Path: m.Groups[2].Value));

    [Fact]
    public void HandMappedRoutes_MatchExactlyTheFiveRoutesAGeneratedSetCannotServe()
    {
        var handMapped = HandMappedRoutes(AccountGroupsEndpointSourcePath)
            .Concat(HandMappedRoutes(AccountsEndpointSourcePath))
            .ToArray();

        handMapped.ShouldBe(
            [
                ("Get", "{id:guid}/balances"), // reading a group's totals per currency
                ("Post", "/"), // opening an account
                ("Patch", "{id:guid}"), // changing an account's status/limits
                ("Get", "{id:guid}/balance"), // reading an account's balance
                ("Get", "{id:guid}/statement") // reading an account's statement
            ],
            ignoreOrder: true);
    }
}

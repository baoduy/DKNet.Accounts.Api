namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1522 §5, "The published refusal documentation describes the new body" — per the brief's §8 extra
/// check, this scenario goes green only once docs-writer's stage-2 commit lands on the branch; it is
/// authored here, red against today's README, so Build's drift check (§3 row 15 + this file) has something
/// frozen to measure against.
/// </summary>
public sealed class RefusalDocumentationTests
{
    private static string ReadmePath => Path.GetFullPath(Path.Combine(
        AppContext.BaseDirectory, "../../../../..", "README.md"));

    private static string ReadSection(string startHeading, string endHeading)
    {
        var readme = File.ReadAllText(ReadmePath);
        var start = readme.IndexOf(startHeading, StringComparison.Ordinal);
        start.ShouldBeGreaterThanOrEqualTo(0, $"expected to find '{startHeading}' in {ReadmePath}");
        var end = readme.IndexOf(endHeading, start, StringComparison.Ordinal);
        end.ShouldBeGreaterThan(start, $"expected to find '{endHeading}' after '{startHeading}' in {ReadmePath}");
        return readme[start..end];
    }

    [Fact]
    public void RefusalSection_NoLongerNamesADetailMember()
    {
        var section = ReadSection("### Refusals and error codes", "### Invariants the service guarantees");
        section.ShouldNotContain(
            "detail",
            customMessage: "the refusal documentation should no longer tell a caller to read a `detail` member " +
                "(DRK-1522: the error list itself, not `detail`, carries what distinguishes two same-code refusals).");
    }

    [Fact]
    public void RouteTable_ShowsAccountGroupCloseAsPartOfTheGeneratedSet()
    {
        var section = ReadSection(
            "#### Which routes are generated, and which are hand-written", "**Authentication.**");
        section.ShouldNotContain(
            "`POST /v1/account-groups/{id}/close` | **request and handler generated**, route hand-written",
            customMessage: "close moves into the generated account-group route set this cycle (§3 row 11) — " +
                "the table's own row for it should no longer list the route itself as hand-written.");
    }
}

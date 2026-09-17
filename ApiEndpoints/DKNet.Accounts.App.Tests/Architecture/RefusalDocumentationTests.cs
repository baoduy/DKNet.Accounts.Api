using System.Reflection;
using System.Text.RegularExpressions;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1522 §5, "The published refusal documentation describes the new body" — per the brief's §8 extra
/// check, this scenario goes green only once docs-writer's stage-2 commit lands on the branch; it is
/// authored here, red against today's README, so Build's drift check (§3 row 15 + this file) has something
/// frozen to measure against.
/// </summary>
public sealed class RefusalDocumentationTests
{
    private const string RefusalSectionStart = "### Refusals and error codes";
    private const string RefusalSectionEnd = "### Invariants the service guarantees";

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
        var section = ReadSection(RefusalSectionStart, RefusalSectionEnd);
        section.ShouldNotContain(
            "detail",
            customMessage: "the refusal documentation should no longer tell a caller to read a `detail` member " +
                "(DRK-1522: the error list itself, not `detail`, carries what distinguishes two same-code refusals).");
    }

    /// <summary>Word-boundary, case-sensitive: a plain (case-insensitive) "contains" check on "errors" is a
    /// fragment match that a completely untouched README already trips — the section's own closing line
    /// ("a constant in ... LedgerErrors.cs") contains the substring "Errors", so a looser check would pass
    /// today for the wrong reason.</summary>
    private static readonly Regex ErrorsListMember = new(@"\berrors\b");

    [Fact]
    public void RefusalSection_NamesTheErrorsListMember()
    {
        var section = ReadSection(RefusalSectionStart, RefusalSectionEnd);
        ErrorsListMember.IsMatch(section).ShouldBeTrue(
            "the refusal documentation should describe the new body's `errors` list member as its own word " +
            "— today's text never mentions it (only the unrelated \"LedgerErrors.cs\" filename reference).");
    }

    [Fact]
    public void RefusalSection_ShowsTheCodeLivingInsideEachError()
    {
        var section = ReadSection(RefusalSectionStart, RefusalSectionEnd);
        var errorsMatch = ErrorsListMember.Match(section);
        errorsMatch.Success.ShouldBeTrue("expected the `errors` list member to be named first (see the sibling test).");

        Regex.IsMatch(section[errorsMatch.Index..], @"\bcode\b", RegexOptions.None).ShouldBeTrue(
            "the refusal documentation should show the stable code living inside each entry of the `errors` " +
            "list (e.g. `errors[].code`), described after the word `errors`, not merely mention `code` on " +
            "its own the way today's top-level-`code` description does.");
    }

    /// <summary>
    /// Every <see cref="LedgerErrors"/> string constant (excluding the two metadata-key constants, which are
    /// not refusal codes) must still be listed in the table with its documented HTTP status — reflected off
    /// the source of record README itself names ("Every code above is a constant in ... LedgerErrors.cs; that
    /// file is the authority"), so a README that silently dropped half the code table stays red here even
    /// though the two clauses above could both already be green.
    /// </summary>
    [Fact]
    public void RefusalSection_ListsEveryDocumentedCodeWithItsStatus()
    {
        var section = ReadSection(RefusalSectionStart, RefusalSectionEnd);
        var codes = typeof(LedgerErrors)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(f => f.IsLiteral && !f.IsInitOnly && f.FieldType == typeof(string))
            .Where(f => f.Name is not (nameof(LedgerErrors.CodeKey) or nameof(LedgerErrors.ReplayedKey)))
            .Select(f => (string)f.GetRawConstantValue()!)
            .ToList();

        codes.ShouldNotBeEmpty("expected at least one LedgerErrors code constant to check against the table.");

        foreach (var code in codes)
        {
            var index = section.IndexOf(code, StringComparison.Ordinal);
            index.ShouldBeGreaterThanOrEqualTo(0, $"expected the refusal table to list the code \"{code}\".");

            var line = LineContaining(section, index);
            Regex.IsMatch(line, @"\b\d{3}\b").ShouldBeTrue(
                $"expected the row for \"{code}\" to carry its documented HTTP status, got: {line}");
        }
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

    private static string LineContaining(string text, int index)
    {
        var start = text.LastIndexOf('\n', index) + 1;
        var end = text.IndexOf('\n', index);
        return text[start..(end < 0 ? text.Length : end)];
    }
}

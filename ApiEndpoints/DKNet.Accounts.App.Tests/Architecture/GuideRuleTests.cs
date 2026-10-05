namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-2105 §5, "Each guide states the AppHost rule": the maintainer guide (root <c>CLAUDE.md</c>) and the
/// agent guide (root <c>AGENTS.md</c>) both carry the rule sentence verbatim (brief §6 R2).
/// </summary>
public sealed class GuideRuleTests
{
    private const string RuleSentence =
        "The AppHost is for local runs only: it is excluded from coverage and has no tests.";

    [Theory]
    [InlineData("maintainer guide", "CLAUDE.md")]
    [InlineData("agent guide", "AGENTS.md")]
    public void EachGuide_StatesTheRule(string guide, string fileName)
    {
        var path = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../..", fileName));

        File.Exists(path).ShouldBeTrue($"the {guide} should exist at {path}");
        File.ReadAllText(path).ShouldContain(RuleSentence, Case.Sensitive,
            $"the {guide} ({fileName}) should state: {RuleSentence}");
    }
}

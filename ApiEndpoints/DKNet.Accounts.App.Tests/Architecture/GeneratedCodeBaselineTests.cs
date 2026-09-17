namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1380 row 2 (DRK-1373 §5 "The generated code changes only in the … expected ways"): pins the
/// <c>DKNet.SlimBus.Generators</c> CRUD composite output for <c>AccountGroup</c> and <c>Account</c> — the two
/// entities DRK-1467 §8's one expected 10.1.29 difference lives in — so an unreviewed change in generated
/// code cannot land silently when the pin moves. Narrowed to these two entities' CrudGenerator output
/// (DRK-1373 Q1 default): the full generator surface, every <c>DtoGenerator</c> and <c>CrudGenerator</c>
/// emission across every entity, is too large and churny to commit whole, and the expected difference does
/// not touch it.
/// </summary>
public sealed class GeneratedCodeBaselineTests
{
    private static readonly string[] BaselineFileNames =
    [
        "AccountCrudEndpoints.g.cs",
        "AccountCrudHandlers.g.cs",
        "AccountCrudRequests.g.cs",
        "AccountGroupCrudEndpoints.g.cs",
        "AccountGroupCrudHandlers.g.cs",
        "AccountGroupCrudRequests.g.cs"
    ];

    private static string SrcDir => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));

    private static string GeneratedDir => Path.Combine(
        SrcDir, "ApiEndpoints", "DKNet.Accounts.AppServices", "obj", "Generated",
        "DKNet.SlimBus.Generators", "DKNet.SlimBus.Generators.CrudGenerator");

    private static string BaselineDir => Path.Combine(
        SrcDir, "ApiEndpoints", "DKNet.Accounts.App.Tests", "Architecture", "Baselines", "Generated");

    public static IEnumerable<object[]> BaselineFiles() => BaselineFileNames.Select(f => new object[] { f });

    [Theory]
    [MemberData(nameof(BaselineFiles))]
    public void GeneratedOutput_MatchesCommittedBaseline(string fileName)
    {
        var generatedPath = Path.Combine(GeneratedDir, fileName);
        File.Exists(generatedPath).ShouldBeTrue(
            $"expected '{fileName}' under {GeneratedDir} — build the solution before running this test, " +
            "or the generator no longer emits this file at all, which is itself a difference outside R3's four.");

        var actual = File.ReadAllText(generatedPath);
        var expected = File.ReadAllText(Path.Combine(BaselineDir, $"{fileName}.baseline"));

        actual.ShouldBe(expected,
            $"'{fileName}' no longer matches the committed DKNet 10.1.26 baseline. Classify the diff against " +
            "DRK-1467 §8's one expected 10.1.29 difference before accepting it: a parameterless [CrudAction] " +
            "(AccountGroup.Activate, AccountGroup.Close) now maps through MapParameterlessActionById instead " +
            "of MapActionById (DKNet gap DRK-1436 fixed at 10.1.29 — the generated route no longer requires a " +
            "JSON body). Anything else is a finding to resolve before the pin bump lands.");
    }
}

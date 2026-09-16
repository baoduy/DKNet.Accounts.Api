namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1380 row 2 (DRK-1373 §5 "The generated code changes only in the … expected ways"): pins the
/// <c>DKNet.SlimBus.Generators</c> CRUD composite output for <c>AccountGroup</c> and <c>Account</c> — the two
/// entities DRK-1373 §3/§6 R3's four expected 10.1.26 differences live in — so an unreviewed change in
/// generated code cannot land silently when the pin moves. Narrowed to these two entities' CrudGenerator
/// output (DRK-1373 Q1 default): the full generator surface, every <c>DtoGenerator</c> and
/// <c>CrudGenerator</c> emission across every entity, is too large and churny to commit whole, and the four
/// expected differences do not touch it.
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
            $"'{fileName}' no longer matches the committed DKNet 10.1.24 baseline. Classify the diff against " +
            "DRK-1373 §6 R3's four expected 10.1.26 differences before accepting it: (a) a new delete request " +
            "type for AccountGroup/Account, (b) one new per-entity route-name-check line in the CRUD composite, " +
            "(c) each composite route wrapped so a caller can exclude or configure it, (d) the delete map call's " +
            "type-argument count (two-argument at 10.1.24, three at 10.1.26). Anything else is a finding to " +
            "resolve before the pin bump lands.");
    }
}

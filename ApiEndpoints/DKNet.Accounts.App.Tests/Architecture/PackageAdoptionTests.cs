using System.Xml.Linq;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// Covers DRK-500's "the template depends on the published package rather than a copy" and "the two test
/// suites share one set of helpers" acceptance scenarios.
/// </summary>
public class PackageAdoptionTests
{
    #region Methods

    [Theory]
    [InlineData("DKNet.Accounts.Api/Configs/Endpoints/EndpointConfig.cs")]
    [InlineData("DKNet.Accounts.Api/Configs/Endpoints/FluentEndpointMapperExtensions.cs")]
    [InlineData("DKNet.Accounts.Api/Configs/Endpoints/IEndpointConfig.cs")]
    [InlineData("DKNet.Accounts.Api/Configs/Endpoints/PagedResult.cs")]
    [InlineData("DKNet.Accounts.Api/Extensions/ProblemDetailsExtensions.cs")]
    [InlineData("DKNet.Accounts.Api/Extensions/ResultResponseExtensions.cs")]
    public void PackagedPlumbing_ShouldNotHaveATemplateCopy(string relativePath)
    {
        var srcDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));

        File.Exists(Path.Combine(srcDir, "ApiEndpoints", relativePath)).ShouldBeFalse(
            $"{relativePath} duplicates plumbing the package now provides — it should have been removed.");
    }

    [Theory]
    [InlineData("DKNet.Accounts.App.Tests/DKNet.Accounts.App.Tests.csproj")]
    [InlineData("DKNet.Accounts.App.BDDTests/DKNet.Accounts.App.BDDTests.csproj")]
    public void BothTestSuites_ShouldReferenceTheSharedTestSupportProject(string relativeCsprojPath)
    {
        var srcDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
        var csprojPath = Path.Combine(srcDir, "ApiEndpoints", relativeCsprojPath);

        File.Exists(csprojPath).ShouldBeTrue();
        var doc = XDocument.Load(csprojPath);

        var referencesTestSupport = doc.Descendants("ProjectReference")
            .Any(e => (e.Attribute("Include")?.Value ?? "").Contains("DKNet.Accounts.App.TestSupport",
                StringComparison.OrdinalIgnoreCase));

        referencesTestSupport.ShouldBeTrue($"{relativeCsprojPath} should reference DKNet.Accounts.App.TestSupport.");
    }

    [Theory]
    [InlineData("DKNet.Accounts.App.Tests/Integration/Support/Eventually.cs")]
    [InlineData("DKNet.Accounts.App.Tests/Integration/Support/TestLogCapture.cs")]
    [InlineData("DKNet.Accounts.App.Tests/Integration/Support/TestMembershipService.cs")]
    [InlineData("DKNet.Accounts.App.BDDTests/Support/Eventually.cs")]
    [InlineData("DKNet.Accounts.App.BDDTests/Support/TestLogCapture.cs")]
    [InlineData("DKNet.Accounts.App.BDDTests/Support/TestMembershipService.cs")]
    public void SharedTestHelpers_ShouldNotHaveAPerSuiteCopy(string relativePath)
    {
        var srcDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));

        File.Exists(Path.Combine(srcDir, "ApiEndpoints", relativePath)).ShouldBeFalse(
            $"{relativePath} duplicates a helper that now lives in DKNet.Accounts.App.TestSupport.");
    }

    [Fact]
    public void StatusCountsEndpointMapper_ShouldStillWireGetStatusCountsAsATemplateLocalGetEndpoint()
    {
        // "Also verify" item on DRK-500: MapGetStatusCounts moved into its own template-local file while
        // everything else moved into the package (status-count endpoints stay template-local per §4).
        var srcDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
        var sourcePath = Path.Combine(srcDir,
            "ApiEndpoints/DKNet.Accounts.Api/Configs/Endpoints/StatusCountsEndpointMapperExtensions.cs");

        File.Exists(sourcePath).ShouldBeTrue();
        var source = File.ReadAllText(sourcePath);

        source.ShouldContain("public RouteHandlerBuilder MapGetStatusCounts<TEntity>(");
        source.ShouldContain("app.MapGet(");
        source.ShouldContain("repo.GetStatusCounts<TEntity>(");
    }

    #endregion
}

using System.Xml.Linq;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1028 §5: the build-side hardening items (dependency-vulnerability audit failing the build/pipeline, the
/// published container image running as non-root) are properties of the build, not the running service — same
/// file-inspection style as <see cref="PackageAdoptionTests" />/<see cref="SecureDefaultAppSettingsTests" />.
/// </summary>
public class BuildAndContainerHardeningTests
{
    private static string SrcDir() => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));

    [Fact]
    public void DirectoryPackagesProps_EnablesNuGetAuditForAllDependenciesAtModerateSeverity()
    {
        var path = Path.Combine(SrcDir(), "Directory.Packages.props");
        File.Exists(path).ShouldBeTrue();
        var doc = XDocument.Load(path);

        var props = doc.Descendants("PropertyGroup").Elements()
            .ToDictionary(e => e.Name.LocalName, e => e.Value, StringComparer.Ordinal);

        props.ShouldContainKey("NuGetAudit");
        props["NuGetAudit"].ShouldBe("true", StringCompareShould.IgnoreCase);
        props.ShouldContainKey("NuGetAuditMode");
        props["NuGetAuditMode"].ShouldBe("all", StringCompareShould.IgnoreCase);
        props.ShouldContainKey("NuGetAuditLevel");
        props["NuGetAuditLevel"].ShouldBe("moderate", StringCompareShould.IgnoreCase);
    }

    [Fact]
    public void DirectoryPackagesProps_PromotesTheAuditWarningsToErrors_SoTheBuildFailsAndNamesThePackage()
    {
        var path = Path.Combine(SrcDir(), "Directory.Packages.props");
        var content = File.ReadAllText(path);

        // NU1901 (low) / NU1902 (moderate) / NU1903 (high) / NU1904 (critical) — a moderate-or-above vulnerable
        // package must fail the build, not just warn (WarningsAsErrors is what fails it; NuGetAuditLevel=moderate
        // alone would only ever warn).
        content.ShouldContain("NU1901");
        content.ShouldContain("NU1902");
        content.ShouldContain("NU1903");
        content.ShouldContain("NU1904");
        content.ShouldContain("WarningsAsErrors");
    }

    [Fact]
    public void CiWorkflow_WhenPresent_RunsOnPullRequestAndDevPush_SoTheAuditGatesThePipelineNotJustLocalBuilds()
    {
        // Authoring the CI workflow is devops-routed, not part of this cycle (DRK-1250) — this guard only
        // enforces shape once the workflow exists; it does not itself require one to exist.
        var path = Path.Combine(SrcDir(), "..", ".github", "workflows", "build.yml");
        if (!File.Exists(path)) return;

        var content = File.ReadAllText(path);
        content.ShouldContain("pull_request");
        content.ShouldContain("dev");
        content.ShouldContain("dotnet build");
    }

    [Fact]
    public void DKNet_AccountsApiCsproj_PublishesTheContainerImageAsNonRoot()
    {
        var path = Path.Combine(SrcDir(), "ApiEndpoints", "DKNet.Accounts.Api", "DKNet.Accounts.Api.csproj");
        File.Exists(path).ShouldBeTrue();
        var doc = XDocument.Load(path);

        var containerUser = doc.Descendants("ContainerUser").Select(e => e.Value).FirstOrDefault();
        containerUser.ShouldNotBeNullOrWhiteSpace(
            "no ContainerUser means the .NET SDK container build defaults to root — the image's default user " +
            "must be explicitly non-root.");
        containerUser.ShouldNotBe("root");
        containerUser.ShouldNotBe("0");
    }
}

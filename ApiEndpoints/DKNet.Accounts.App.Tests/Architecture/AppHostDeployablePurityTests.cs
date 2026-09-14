using System.Xml.Linq;
using NetArchTest.Rules;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-1135 §6: the sample-data generation capability (and its <c>Bogus</c> dependency) must stay
/// confined to <c>DKNet.Accounts.AppHost</c> — these are published NuGet packages with nothing to deploy
/// against, and the four deployable/library projects must never carry dev-only bulk-data generation
/// along for the ride. Checked two ways: statically (csproj package references, mirroring
/// <see cref="PackageArchitectureTests"/>) and structurally (compiled-assembly dependencies via
/// NetArchTest, mirroring <see cref="InfraTests"/>/<see cref="ApiTests"/>) — the second is the guard
/// that survives someone later "tidying" the package reference upward without also introducing a type
/// dependency, or vice versa.
/// </summary>
public sealed class AppHostDeployablePurityTests
{
    [Fact]
    public void OnlyDKNet_AccountsAppHostCsproj_ShouldReferenceTheBogusPackage()
    {
        var srcDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
        var csprojFiles = Directory.GetFiles(srcDir, "*.csproj", SearchOption.AllDirectories);

        var offenders = csprojFiles
            .Where(f => !Path.GetFileNameWithoutExtension(f).Equals("DKNet.Accounts.AppHost", StringComparison.Ordinal))
            // Test projects are never packed/deployed — the same reason coverage.runsettings excludes
            // *Tests — so DKNet.Accounts.App.Tests' own AutoBogus/Bogus usage is not a purity violation.
            .Where(f => !Path.GetFileNameWithoutExtension(f).EndsWith("Tests", StringComparison.Ordinal))
            .Where(f => XDocument.Load(f).Descendants("PackageReference")
                .Any(e => string.Equals(e.Attribute("Include")?.Value, "Bogus", StringComparison.OrdinalIgnoreCase)))
            .Select(Path.GetFileName)
            .ToArray();

        offenders.ShouldBeEmpty(
            "Only DKNet.Accounts.AppHost may reference Bogus — the generation capability must not travel with the " +
            $"deployable/library projects. Offenders: {string.Join(", ", offenders)}");
    }

    [Theory]
    [InlineData("DKNet.Accounts.Api", typeof(DKNet.Accounts.Api.Program))]
    [InlineData("DKNet.Accounts.AppServices", typeof(DKNet.Accounts.AppServices.AppSetup))]
    [InlineData("DKNet.Accounts.Domains", typeof(DKNet.Accounts.Domains.Share.DomainSchemas))]
    [InlineData("DKNet.Accounts.Infra", typeof(DKNet.Accounts.Infra.Extensions.InfraSetup))]
    public void DeployableAndLibraryAssemblies_ShouldNotDependOnBogusOrTheAppHostGenerationCapability(
        string assemblyName, Type typeFromAssembly)
    {
        var noBogus = Types.InAssembly(typeFromAssembly.Assembly).Should().NotHaveDependencyOn("Bogus").GetResult();
        noBogus.IsSuccessful.ShouldBeTrue(
            $"{assemblyName} must not depend on Bogus: {string.Join(", ", (noBogus.FailingTypes ?? []).Select(t => t.FullName))}");

        var noAppHost = Types.InAssembly(typeFromAssembly.Assembly).Should()
            .NotHaveDependencyOn("DKNet.Accounts.AppHost").GetResult();
        noAppHost.IsSuccessful.ShouldBeTrue(
            $"{assemblyName} must not depend on DKNet.Accounts.AppHost's generation capability: " +
            string.Join(", ", (noAppHost.FailingTypes ?? []).Select(t => t.FullName)));
    }
}

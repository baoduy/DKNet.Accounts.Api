using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Xml.Linq;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>DRK-1638 §5 — the client project's packaging contract (@integration): it packs cleanly, its
/// description tells a consumer how to restore it, and the installed package pulls in no project of the
/// accounts service (spec §3 row 1/row 11, R4). Runs a real <c>dotnet pack</c> — the proof each of these
/// rows names is exactly "deleting this turns [the pack, or the nuspec's shape] wrong".</summary>
public sealed class PackagingTests
{
    private static string RepoRoot
    {
        get
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "DKNet.Accounts.sln")))
            {
                dir = dir.Parent;
            }

            return dir?.FullName ?? throw new InvalidOperationException("Could not locate the repository root from the test output directory.");
        }
    }

    private static string ClientCsprojPath =>
        Path.Combine(RepoRoot, "ApiEndpoints", "DKNet.Accounts.Client", "DKNet.Accounts.Client.csproj");

    private static (int ExitCode, string OutputDirectory) RunPack()
    {
        var outputDirectory = Path.Combine(Path.GetTempPath(), $"dknet-accounts-client-pack-{Guid.NewGuid():N}");
        var psi = new ProcessStartInfo("dotnet", $"pack \"{ClientCsprojPath}\" -c Release -o \"{outputDirectory}\"")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };
        using var process = Process.Start(psi)!;
        process.WaitForExit();
        return (process.ExitCode, outputDirectory);
    }

    /// <summary>"The client project packs as a NuGet package."</summary>
    [Fact]
    public void TheClientProjectPacksAsANuGetPackage()
    {
        var (exitCode, outputDirectory) = RunPack();

        exitCode.ShouldBe(0, "dotnet pack must succeed with no error");
        Directory.GetFiles(outputDirectory, "DKNet.Accounts.Client*.nupkg").ShouldNotBeEmpty();
    }

    /// <summary>"The published package tells a consumer how to restore it."</summary>
    [Fact]
    public void ThePublishedPackageTellsAConsumerHowToRestoreIt()
    {
        var (exitCode, outputDirectory) = RunPack();
        exitCode.ShouldBe(0);
        var nuspec = ReadNuspec(outputDirectory);

        var description = nuspec.Descendants().First(e => e.Name.LocalName == "description").Value;
        description.ShouldContain("token", Case.Insensitive);
        description.ShouldNotContain("ghp_"); // never an actual token literal, only guidance
    }

    /// <summary>"The installed package pulls in no project of the accounts service" (R4).</summary>
    [Fact]
    public void TheInstalledPackagePullsInNoProjectOfTheAccountsService()
    {
        var csprojXml = XDocument.Load(ClientCsprojPath);
        csprojXml.Descendants().Count(e => e.Name.LocalName == "ProjectReference").ShouldBe(0);

        var (exitCode, outputDirectory) = RunPack();
        exitCode.ShouldBe(0);
        var nuspec = ReadNuspec(outputDirectory);

        var dependencyIds = nuspec.Descendants().Where(e => e.Name.LocalName == "dependency")
            .Select(e => e.Attribute("id")?.Value ?? string.Empty);
        dependencyIds.ShouldNotContain(id => id.StartsWith("DKNet.Accounts.", StringComparison.Ordinal));
    }

    private static XDocument ReadNuspec(string outputDirectory)
    {
        var nupkgPath = Directory.GetFiles(outputDirectory, "DKNet.Accounts.Client*.nupkg")
            .First(f => !f.EndsWith(".snupkg", StringComparison.Ordinal));
        using var archive = ZipFile.OpenRead(nupkgPath);
        var entry = archive.Entries.First(e => e.Name.EndsWith(".nuspec", StringComparison.Ordinal));
        using var stream = entry.Open();
        return XDocument.Load(stream);
    }
}

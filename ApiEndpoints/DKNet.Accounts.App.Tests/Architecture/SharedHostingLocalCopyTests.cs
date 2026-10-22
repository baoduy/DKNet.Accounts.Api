namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// DRK-2332 §1 "Done means": none of the repos keeps its own copy of an item it now gets from DKNet 13.3.0's
/// DKNet.AspCore.Extensions or DKNet.Fw.Extensions. Mirrors <see cref="PackageAdoptionTests" />.
/// </summary>
public class SharedHostingLocalCopyTests
{
    [Theory]
    [InlineData("DKNet.Accounts.Api/Configs/HostConfigMarker.cs")]
    [InlineData("DKNet.Accounts.Api/Configs/ForwardedHeadersConfig.cs")]
    [InlineData("DKNet.Accounts.Api/Configs/HttpsConfig.cs")]
    [InlineData("DKNet.Accounts.Api/Configs/CrosConfig.cs")]
    [InlineData("DKNet.Accounts.Api/Configs/RequestBoundsConfig.cs")]
    [InlineData("DKNet.Accounts.Api/Configs/Handlers/HttpContextSensitiveDataPrincipalAccessor.cs")]
    [InlineData("DKNet.Accounts.Share/Extensions/SanitizeForLogging.cs")]
    public void SharedHostingFile_ShouldNotHaveALocalCopy(string relativePath)
    {
        File.Exists(Path.Combine(ApiEndpointsDir(), relativePath)).ShouldBeFalse(
            $"{relativePath} duplicates an item DKNet 13.3.0 now provides — it should have been removed.");
    }

    [Theory]
    [InlineData("DKNet.Accounts.Api/Configs/RateLimits")]
    [InlineData("DKNet.Accounts.Api/Configs/Antiforgery")]
    public void SharedHostingFolder_ShouldNotHaveALocalCopy(string relativePath)
    {
        Directory.Exists(Path.Combine(ApiEndpointsDir(), relativePath)).ShouldBeFalse(
            $"{relativePath} holds a copy of an item DKNet 13.3.0 now provides — it should have been removed.");
    }

    /// <summary>The source tree's <c>ApiEndpoints</c> folder, proven to be it so an absence above can mean something.</summary>
    private static string ApiEndpointsDir()
    {
        var dir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../..", "ApiEndpoints"));
        File.Exists(Path.Combine(dir, "DKNet.Accounts.Api/Program.cs")).ShouldBeTrue($"{dir} is not the source tree.");
        return dir;
    }
}

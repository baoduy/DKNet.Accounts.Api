using System.Xml.Linq;

namespace DKNet.Accounts.App.Tests.Architecture.Guards;

/// <summary>
/// R1 (DRK-1233): the DKNet pin invariant is that every DKNet.* framework package agrees on one release,
/// never that the release matches a hardcoded literal. <c>DKNet.Notification.*</c> is a separately versioned
/// product, not part of the framework release, so it is left out (DRK-2156).
/// </summary>
internal static class PackagePinGuard
{
    /// <summary>
    /// Distinct Version values of every PackageVersion whose Include starts with "DKNet.", except
    /// "DKNet.Notification.".
    /// </summary>
    internal static IReadOnlyList<string> DistinctDkNetVersions(XDocument directoryPackagesProps)
        => directoryPackagesProps.Descendants("PackageVersion")
            .Where(e => (e.Attribute("Include")?.Value ?? "") is var include
                        && include.StartsWith("DKNet.", StringComparison.Ordinal)
                        && !include.StartsWith("DKNet.Notification.", StringComparison.Ordinal))
            .Select(e => e.Attribute("Version")?.Value ?? "")
            .Distinct()
            .ToList();
}

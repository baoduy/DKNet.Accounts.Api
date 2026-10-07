#!/usr/bin/env bash
set -euo pipefail

# An isolated project and empty package cache prove the workflow token can download
# the published client. The solution gains no package reference or version change.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
probe_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/notification-feed.XXXXXX")"
trap 'rm -rf "$probe_dir"' EXIT

cat > "$probe_dir/FeedProbe.csproj" <<'PROJECT'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ManagePackageVersionsCentrally>false</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="DKNet.Notification.Client" Version="[0.0.4]" />
  </ItemGroup>
</Project>
PROJECT

dotnet restore "$probe_dir/FeedProbe.csproj" \
  --configfile "$repo_root/nuget.config" \
  --packages "$probe_dir/packages" --no-http-cache --verbosity minimal

python3 - "$probe_dir/packages/dknet.notification.client/0.0.4" <<'PYTHON'
import json
import pathlib
import sys
import zipfile
import xml.etree.ElementTree as ET

package = pathlib.Path(sys.argv[1])
metadata = json.loads((package / ".nupkg.metadata").read_text())
assert metadata["source"] == "https://nuget.pkg.github.com/baoduy/index.json"
with zipfile.ZipFile(package / "dknet.notification.client.0.0.4.nupkg") as archive:
    nuspec = ET.fromstring(archive.read("DKNet.Notification.Client.nuspec"))
assert nuspec.find(".//{*}id").text == "DKNet.Notification.Client"
assert nuspec.find(".//{*}version").text == "0.0.4"
print("Verified DKNet.Notification.Client 0.0.4 downloaded from the GitHub Packages feed.")
PYTHON

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo 'Verified DKNet.Notification.Client 0.0.4 downloaded from GitHub Packages using the workflow token.' >> "$GITHUB_STEP_SUMMARY"
fi

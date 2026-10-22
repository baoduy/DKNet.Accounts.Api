using DKNet.Accounts.Api.Configs.AzureAppConfig;

namespace DKNet.Accounts.App.Tests.Unit.Configs;

/// <summary>
/// DRK-2340 B1: the label selector <c>op.Select(KeyFilter.Any, label)</c> also fetches feature flags that carry the
/// service label. <see cref="AzureAppConfigOptions.ShouldLoadSetting"/> decides which fetched settings are kept, so
/// <c>LoadFeatureFlags=false</c> loads no flag, a <c>FeatureFlagPrefix</c> loads only matching flags, and normal keys
/// always load. Kept apart from the frozen <c>AzureAppConfig/AzureAppConfigOptionsTests</c> reproduction.
/// </summary>
public sealed class AzureAppConfigSettingFilterTests
{
    #region Methods

    private static AzureAppConfigOptions Options(bool? loadFeatureFlags, string? featureFlagPrefix) =>
        new() { LoadFeatureFlagsSetting = loadFeatureFlags, FeatureFlagPrefix = featureFlagPrefix };

    [Theory]
    [InlineData(false, "", ".appconfig.featureflag/X", false)]
    [InlineData(false, "Accounts.", ".appconfig.featureflag/Accounts.X", false)]
    [InlineData(true, "Accounts.", ".appconfig.featureflag/Other", false)]
    [InlineData(true, "Accounts.", ".appconfig.featureflag/accounts.X", false)]
    [InlineData(true, "Accounts.", ".appconfig.featureflag/Accounts.X", true)]
    [InlineData(true, "", ".appconfig.featureflag/X", true)]
    [InlineData(true, "   ", ".appconfig.featureflag/X", true)]
    [InlineData(null, null, ".appconfig.featureflag/X", true)]
    public void FeatureFlag_IsKept_OnlyWhenFlagsAreOn_AndItsNameStartsWithThePrefix(
        bool? loadFeatureFlags, string? featureFlagPrefix, string key, bool expected)
    {
        var options = Options(loadFeatureFlags, featureFlagPrefix);

        options.ShouldLoadSetting(key).ShouldBe(expected);
    }

    [Theory]
    [InlineData(false, "")]
    [InlineData(false, "Accounts.")]
    [InlineData(true, "Accounts.")]
    [InlineData(true, "")]
    [InlineData(null, null)]
    public void NormalKey_IsAlwaysKept_WhateverTheFlagSettings(bool? loadFeatureFlags, string? featureFlagPrefix)
    {
        var options = Options(loadFeatureFlags, featureFlagPrefix);

        options.ShouldLoadSetting("Logging:LogLevel:Default").ShouldBeTrue();
        options.ShouldLoadSetting("Settings/.appconfig.featureflag/X").ShouldBeTrue();
    }

    #endregion
}

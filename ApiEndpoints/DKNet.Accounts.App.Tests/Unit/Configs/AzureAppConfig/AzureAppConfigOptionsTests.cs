using Microsoft.Extensions.Configuration;
using DKNet.Accounts.Api.Configs.AzureAppConfig;

namespace DKNet.Accounts.App.Tests.Unit.Configs.AzureAppConfig;

/// <summary>
/// DRK-2335 reproduction: the Azure App Configuration options are read from the documented
/// <c>AzureAppConfiguration</c> section and connection string <c>AzureAppConfig</c>, and the effective label,
/// feature-flag filter and refresh interval follow the owner's rules (R1–R5). Binds the options exactly the way
/// <see cref="AzureAppConfigSetup.AddAzureAppConfig"/> does — no host, no store.
/// </summary>
public sealed class AzureAppConfigOptionsTests
{
    #region Methods

    private static IConfigurationRoot BuildConfig(params (string Key, string? Value)[] settings) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(settings.ToDictionary(s => s.Key, s => s.Value, StringComparer.Ordinal))
            .Build();

    private static AzureAppConfigOptions Bind(IConfiguration config) =>
        config.GetSection(AzureAppConfigOptions.Name).Get<AzureAppConfigOptions>() ?? new AzureAppConfigOptions();

    private static AzureAppConfigOptions Bind(params (string Key, string? Value)[] settings) =>
        Bind(BuildConfig(settings));

    private static IConfigurationRoot LoadShippedAppSettings()
    {
        var srcDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
        var path = Path.Combine(srcDir, "ApiEndpoints/DKNet.Accounts.Api/appsettings.json");
        File.Exists(path).ShouldBeTrue($"base config not found at {path}");

        return new ConfigurationBuilder().AddJsonFile(path, optional: false).Build();
    }

    [Fact]
    public void OptionsSetUnderAzureAppConfiguration_AreRead()
    {
        var options = Bind(
            ("AzureAppConfiguration:Label", "prod"),
            ("AzureAppConfiguration:LoadFeatureFlags", "false"),
            ("AzureAppConfiguration:FeatureFlagPrefix", "Accounts."));

        options.Label.ShouldBe("prod");
        options.LoadFeatureFlags.ShouldBeFalse();
        options.FeatureFlagPrefix.ShouldBe("Accounts.");
    }

    [Fact]
    public void OptionsSetOnlyUnderTheLegacyAzureAppConfigSection_AreNotRead()
    {
        var options = Bind(
            ("AzureAppConfig:Label", "prod"),
            ("AzureAppConfig:LoadFeatureFlags", "false"),
            ("AzureAppConfig:FeatureFlagPrefix", "Accounts."));

        options.Label.ShouldBeNull();
        options.LoadFeatureFlags.ShouldBeTrue();
        options.FeatureFlagPrefix.ShouldBe(string.Empty);
    }

    [Theory]
    [InlineData(null, "DKNet.Accounts.Api")]
    [InlineData("", "DKNet.Accounts.Api")]
    [InlineData("   ", "DKNet.Accounts.Api")]
    [InlineData("prod", "prod")]
    public void Label_ResolvesToTheServiceName_WhenBlank_ElseAsSet(string? label, string expected)
    {
        var options = Bind(("AzureAppConfiguration:Label", label));

        options.ResolveLabel().ShouldBe(expected);
    }

    [Theory]
    [InlineData("false", false)]
    [InlineData("true", true)]
    [InlineData(null, true)]
    public void LoadFeatureFlags_IsOff_OnlyWhenSetToFalse(string? value, bool expected)
    {
        var options = Bind(("AzureAppConfiguration:LoadFeatureFlags", value));

        options.LoadFeatureFlags.ShouldBe(expected);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("Accounts.", "Accounts.*")]
    public void FeatureFlagPrefix_FiltersFlagsByPrefix_OnlyWhenNotBlank(string? prefix, string? expected)
    {
        var options = Bind(("AzureAppConfiguration:FeatureFlagPrefix", prefix));

        options.ResolveFeatureFlagFilter().ShouldBe(expected);
    }

    [Theory]
    [InlineData(null, 300)]
    [InlineData("60", 60)]
    [InlineData("1", 1)]
    [InlineData("0", 300)]
    [InlineData("-5", 300)]
    public void RefreshInterval_IsCacheExpirationInSeconds_FallingBackTo300Seconds(string? value, int expectedSeconds)
    {
        var options = Bind(("AzureAppConfiguration:CacheExpirationInSeconds", value));

        options.ResolveRefreshInterval().ShouldBe(TimeSpan.FromSeconds(expectedSeconds));
    }

    [Theory]
    [InlineData(null, "AzureAppConfig")]
    [InlineData("Custom", "Custom")]
    public void ConnectionStringName_DefaultsToAzureAppConfig_ElseAsSet(string? name, string expected)
    {
        var options = Bind(("AzureAppConfiguration:ConnectionStringName", name));

        options.ConnectionStringName.ShouldBe(expected);
    }

    [Fact]
    public void ShippedAppSettings_CarriesTheSectionAndTheAzureAppConfigConnectionString()
    {
        var config = LoadShippedAppSettings();
        var options = Bind(config);

        config.GetSection(AzureAppConfigOptions.Name).Exists().ShouldBeTrue();
        options.ConnectionStringName.ShouldBe("AzureAppConfig");
        config["ConnectionStrings:AzureAppConfig"].ShouldNotBeNull();
        config["ConnectionStrings:AzureAppConfiguration"].ShouldBeNull();
        config["AzureAppConfiguration:KeyPrefix"].ShouldBeNull();
    }

    [Fact]
    public void ShippedAppSettings_ResolvesToTheServiceLabel_AllFlags_And300SecondRefresh()
    {
        var options = Bind(LoadShippedAppSettings());

        options.ResolveLabel().ShouldBe("DKNet.Accounts.Api");
        options.LoadFeatureFlags.ShouldBeTrue();
        options.ResolveFeatureFlagFilter().ShouldBeNull();
        options.ResolveRefreshInterval().ShouldBe(TimeSpan.FromSeconds(300));
    }

    #endregion
}

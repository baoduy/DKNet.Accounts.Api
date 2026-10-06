using Microsoft.Extensions.Configuration;
using DKNet.Accounts.Api.Configs;
using DKNet.Accounts.Share;

namespace DKNet.Accounts.App.Tests.Unit.Configs;

/// <summary>
/// DRK-2120 surface A §6a rows the DatabaseChoice.feature scenarios do not reach: the setting's values beyond the
/// spec's Examples. The feature covers <c>Postgres</c>, <c>sqlserver</c>, <c>SqlServer</c>, absent and <c>MySql</c>.
/// </summary>
public class DatabaseConfigTests
{
    private static DatabaseProvider Resolve(string value) =>
        DatabaseConfig.ResolveProvider(new ConfigurationBuilder()
            .AddInMemoryCollection([new KeyValuePair<string, string?>("Database:Provider", value)])
            .Build());

    /// <summary>D2: the value is compared without regard to case.</summary>
    [Fact]
    public void ResolveProvider_WhenTheSettingIsPostgresInLowercase_ReturnsPostgres() =>
        Resolve("postgres").ShouldBe(DatabaseProvider.Postgres);

    /// <summary>D4 (Q1): an empty or blank setting counts as absent.</summary>
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ResolveProvider_WhenTheSettingIsEmptyOrBlank_ReturnsPostgres(string value) =>
        Resolve(value).ShouldBe(DatabaseProvider.Postgres);

    /// <summary>
    /// D5: <c>Enum.TryParse</c> accepts a number as a member's value, so "0" and "1" would otherwise pass as
    /// Postgres and SqlServer. Q2: a padded value is not trimmed, so it is refused too.
    /// </summary>
    [Theory]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData(" SqlServer ")]
    public void ResolveProvider_WhenTheSettingIsANumberOrPadded_ThrowsNamingBothAllowedValues(string value)
    {
        var error = Should.Throw<InvalidOperationException>(() => Resolve(value));

        error.Message.ShouldContain("Postgres");
        error.Message.ShouldContain("SqlServer");
    }
}

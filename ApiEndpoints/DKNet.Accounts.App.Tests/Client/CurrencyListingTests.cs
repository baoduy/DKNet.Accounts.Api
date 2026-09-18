using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.Client;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>DRK-1638 §5, "A registered client reads the supported currencies" (@integration). Drives the
/// real service through <see cref="LedgerApiFixture.CreateClient"/> — the spec's own test seam note — so
/// the client is exercised against the service's real seeded currencies (SGD 2dp, JPY 0dp,
/// <see cref="TestApiFactoryBase.SeedCurrenciesAsync"/>), never a literal computed by calling the client's
/// own production code.</summary>
public sealed class CurrencyListingTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    [Fact]
    public async Task ARegisteredClientReadsTheSupportedCurrencies()
    {
        var caller = fixture.CreateClient();
        caller.DefaultRequestHeaders.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
        caller.DefaultRequestHeaders.Add(
            LedgerCallerAuthHandler.ScopesHeaderName, ScopeNames.AccountsRead);
        var client = new AccountClient(caller);

        var currencies = await client.GetCurrenciesAsync();

        currencies.Items.ShouldContain(c => c.Code == "SGD" && c.DecimalPlaces == 2);
        currencies.Items.ShouldContain(c => c.Code == "JPY" && c.DecimalPlaces == 0);
    }
}

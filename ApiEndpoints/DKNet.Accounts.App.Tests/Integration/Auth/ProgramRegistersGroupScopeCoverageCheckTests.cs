using Microsoft.Extensions.Hosting;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;

namespace DKNet.Accounts.App.Tests.Integration.Auth;

/// <summary>
/// DRK-1498 §8's extra done check: the frozen ATs drive <c>GroupScopeAuthorization</c> directly, so none of
/// them would go red if <c>Program.cs</c> forgot to call <see cref="GroupScopeCoverageStartupCheckExtensions.AddGroupScopeCoverageCheck"/>
/// (§3 row 4) — this test asserts the shipped host actually registers it.
/// </summary>
public sealed class ProgramRegistersGroupScopeCoverageCheckTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    [Fact]
    public void ShippedHost_RegistersGroupScopeCoverageCheck()
    {
        var hostedServices = fixture.Services.GetServices<IHostedService>();

        hostedServices.ShouldContain(service => service is GroupScopeCoverageHostedService);
    }
}

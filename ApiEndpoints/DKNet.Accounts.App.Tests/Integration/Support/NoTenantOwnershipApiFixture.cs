using Microsoft.Extensions.DependencyInjection.Extensions;
using DKNet.EfCore.DataAuthorization;
using DKNet.EfCore.Hooks;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// DRK-1467 §5, R1: "the fixture registers no <c>IDataOwnerProvider</c> at all". Otherwise identical to
/// <see cref="LedgerApiFixture"/> (real host, <see cref="LedgerCallerAuthHandler"/> standing in for the JWT
/// bearer scheme) — the difference is <see cref="ConfigureTestServices"/>, which removes the production
/// <c>ServiceConfigs.AddAllAppServices</c>'s <c>AddDataOwnerProvider&lt;CoreDbContext, PrincipalProvider&gt;()</c>
/// registration after the fact: both the <see cref="IDataOwnerProvider"/> registration and every keyed hook
/// registration that call attached for <see cref="CoreDbContext"/>. The internal <c>DataOwnerHook</c> type
/// itself is reached only by its assembly-qualified name (no <c>InternalsVisibleTo</c> needed to compare a
/// <see cref="Type"/> for equality) — today it is the only hook <c>AddDataOwnerProvider</c> attaches to
/// <see cref="CoreDbContext"/> (no other <c>AddHook&lt;CoreDbContext,...&gt;</c> call exists anywhere in this
/// repo), so removing every keyed registration under its hook key is safe and total; leaving either half of
/// the pair in place (e.g. just the plain <see cref="IDataOwnerProvider"/> registration) instead makes EVERY
/// save throw <see cref="InvalidOperationException"/> while the runner resolves the now-orphaned hook, which
/// breaks scenario setup, not just the behaviour under test. Once DRK-1467's Build stage drops the
/// <c>AddDataOwnerProvider</c> call from <c>ServiceConfigs</c> and wires <c>AddCurrentUserProvider</c> instead,
/// this fixture needs no change at all: there is nothing left here to remove, and the real signed-in-user
/// stamp takes over.
/// </summary>
public sealed class NoTenantOwnershipApiFixture : TestApiFactoryBase, IAsyncLifetime
{
    private const string RequireAuthorizationEnvKey = "FeatureManagement__RequireAuthorization";

    public NoTenantOwnershipApiFixture() => Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, "true");

    #region Methods

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        LedgerCallerAuthHandler.Register(services);

        services.RemoveAll<IDataOwnerProvider>();

        var dataOwnerHookType = Type.GetType(
            "DKNet.EfCore.DataAuthorization.Internals.DataOwnerHook, DKNet.EfCore.DataAuthorization",
            throwOnError: true)!;
        var hookKey = typeof(CoreDbContext).FullName!;
        var hookDescriptors = services.Where(d =>
                d.ServiceType == dataOwnerHookType ||
                (d.IsKeyedService && Equals(d.ServiceKey, hookKey) && d.ServiceType == typeof(IHookBaseAsync)))
            .ToList();
        foreach (var descriptor in hookDescriptors)
        {
            services.Remove(descriptor);
        }
    }

    public async Task InitializeAsync()
    {
        _ = CreateClient();
        await ResetDatabaseAsync();
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;

    protected override void Dispose(bool disposing)
    {
        Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, null);
        base.Dispose(disposing);
    }

    #endregion
}

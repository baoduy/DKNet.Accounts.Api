using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// DRK-1467 §5, R1: "the fixture registers no IDataOwnerProvider at all". Otherwise identical to
/// <see cref="LedgerApiFixture"/> (real host, <see cref="LedgerCallerAuthHandler"/> standing in for the JWT
/// bearer scheme) — the difference is <see cref="ConfigureTestServices"/>, which removes the production
/// <c>ServiceConfigs.AddAllAppServices</c>'s <c>AddDataOwnerProvider&lt;CoreDbContext, PrincipalProvider&gt;()</c>
/// registration after the fact: both the <c>IDataOwnerProvider</c> registration and every keyed hook
/// registration that call attached for <see cref="CoreDbContext"/>. Both are matched by service-type NAME
/// rather than by <c>typeof</c>/<c>Type.GetType(throwOnError: true)</c> — DRK-1467 §5 row 8 takes
/// <c>DKNet.EfCore.DataAuthorization</c> out of this repo entirely, and this test project may not re-add a
/// compile reference to it just to keep this fixture compiling (<c>PackageArchitectureTests
/// .NoProject_ShouldReferenceTheTenantOwnershipPackage</c> fails closed on exactly that). Today it is the
/// only hook <c>AddDataOwnerProvider</c> attaches to <see cref="CoreDbContext"/> (no other
/// <c>AddHook&lt;CoreDbContext,...&gt;</c> call exists anywhere in this repo), so removing every keyed
/// registration named <c>DKNet.EfCore.Hooks.IHookBaseAsync</c> under its hook key is safe and total; leaving
/// either half of the pair in place (e.g. just the plain <c>IDataOwnerProvider</c> registration) instead
/// makes EVERY save throw <see cref="InvalidOperationException"/> while the runner resolves the now-orphaned
/// hook, which breaks scenario setup, not just the behaviour under test. Once DRK-1467's Build stage drops
/// the <c>AddDataOwnerProvider</c> call from <c>ServiceConfigs</c> (and, later, the package itself leaves the
/// compile graph), every predicate below matches nothing and removes nothing — production registers no
/// <c>IDataOwnerProvider</c> by then, so this fixture becomes an inert no-op rather than something that needs
/// editing again.
/// </summary>
public sealed class NoTenantOwnershipApiFixture : TestApiFactoryBase, IAsyncLifetime
{
    private const string RequireAuthorizationEnvKey = "FeatureManagement__RequireAuthorization";
    private const string DataOwnerProviderTypeName = "DKNet.EfCore.DataAuthorization.IDataOwnerProvider";
    private const string DataOwnerHookTypeName = "DKNet.EfCore.DataAuthorization.Internals.DataOwnerHook";
    private const string HookBaseAsyncTypeName = "DKNet.EfCore.Hooks.IHookBaseAsync";

    public NoTenantOwnershipApiFixture() => Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, "true");

    #region Methods

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        LedgerCallerAuthHandler.Register(services);

        var hookKey = typeof(CoreDbContext).FullName!;
        var descriptorsToRemove = services.Where(d =>
                d.ServiceType.FullName == DataOwnerProviderTypeName ||
                d.ServiceType.FullName == DataOwnerHookTypeName ||
                (d.IsKeyedService && Equals(d.ServiceKey, hookKey) && d.ServiceType.FullName == HookBaseAsyncTypeName))
            .ToList();
        foreach (var descriptor in descriptorsToRemove)
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

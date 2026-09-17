using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// DRK-1467 §5, R1: "the fixture registers no IDataOwnerProvider at all". Otherwise identical to
/// <see cref="LedgerApiFixture"/> (real host, <see cref="LedgerCallerAuthHandler"/> standing in for the JWT
/// bearer scheme) — the difference is <see cref="ConfigureTestServices"/>, which removes the production
/// <c>ServiceConfigs.AddAllAppServices</c>'s <c>AddDataOwnerProvider&lt;CoreDbContext, PrincipalProvider&gt;()</c>
/// registration after the fact: both the <c>IDataOwnerProvider</c> registration and its keyed
/// <c>DataOwnerHook</c>. Matched by service-type NAME rather than by <c>typeof</c>/
/// <c>Type.GetType(throwOnError: true)</c> — DRK-1467 §5 row 8 takes <c>DKNet.EfCore.DataAuthorization</c> out
/// of this repo entirely, and this test project may not re-add a compile reference to it just to keep this
/// fixture compiling (<c>PackageArchitectureTests.NoProject_ShouldReferenceTheTenantOwnershipPackage</c> fails
/// closed on exactly that).
/// </summary>
/// <remarks>
/// The keyed <c>IHookBaseAsync</c> half cannot be matched by identity: <c>AddHook&lt;TDbContext, THook&gt;</c>
/// (DKNet.EfCore.Hooks) registers it via a factory — <c>AddKeyedScoped&lt;IHookBaseAsync&gt;(key, (p, k) =>
/// p.GetRequiredKeyedService&lt;THook&gt;(k))</c> — so that descriptor's <c>KeyedImplementationType</c> is
/// always <see langword="null"/>, whatever <c>THook</c> is; there is no type to compare. And once DRK-1467
/// row 5 lands (production wiring <c>AddCurrentUserProvider&lt;CoreDbContext, PrincipalProvider&gt;()</c>
/// instead), <c>DKNet.EfCore.AuditLogs</c>' <c>EfCoreAuditHook</c> is keyed under the exact same
/// <see cref="CoreDbContext"/> key with the exact same <c>IHookBaseAsync</c> service type — so a removal keyed
/// only on "any <c>IHookBaseAsync</c> under this DbContext's key" strips the new audit hook right along with
/// the old one, and <c>ICurrentUserProvider</c> resolves with nothing left to call it. Removing every keyed
/// registration named <c>DKNet.EfCore.Hooks.IHookBaseAsync</c> under its hook key is neither safe nor total
/// once a second hook shares that key — it is exactly the wrong thing to do post-row-5.
/// <para/>
/// Instead the keyed clause is gated on tenant-ownership still being registered in this same
/// <see cref="IServiceCollection"/>: today (before row 5) that is true, and <c>DataOwnerHook</c> is the only
/// keyed <c>IHookBaseAsync</c> under this key, so the gated clause removes it — leaving either half of the
/// pair in place instead (e.g. just the plain <c>IDataOwnerProvider</c> registration) makes EVERY save throw
/// <see cref="InvalidOperationException"/> while the runner resolves the now-orphaned hook, which breaks
/// scenario setup, not just the behaviour under test. Once row 5 lands, <c>IDataOwnerProvider</c> is no
/// longer registered, the gate is false, the keyed clause never runs, and <c>EfCoreAuditHook</c> survives
/// untouched — the real signed-in-user stamp takes over and this fixture needs no further change.
/// </remarks>
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
        var dataOwnerStillRegistered = services.Any(d => d.ServiceType.FullName == DataOwnerProviderTypeName);
        var descriptorsToRemove = services.Where(d =>
                d.ServiceType.FullName == DataOwnerProviderTypeName ||
                d.ServiceType.FullName == DataOwnerHookTypeName ||
                (dataOwnerStillRegistered && d.IsKeyedService && Equals(d.ServiceKey, hookKey) &&
                 d.ServiceType.FullName == HookBaseAsyncTypeName))
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

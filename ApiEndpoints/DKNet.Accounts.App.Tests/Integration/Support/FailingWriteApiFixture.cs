using DKNet.EfCore.Hooks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Domains.Services;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// <see cref="ApiFixture" /> variant whose store fails on every write, via
/// <see cref="ThrowingSaveChangesInterceptor" /> added directly on the <c>DbContextOptionsBuilder</c> (not
/// through DI auto-discovery, which needs the internal/external service-provider wiring
/// <c>AddDbContextWithHook</c> may or may not use) — so a create request reliably reaches
/// <c>GlobalExceptionHandler</c> as a genuine unhandled exception, for the "security headers survive a 500"
/// scenario.
/// </summary>
public sealed class FailingWriteApiFixture : TestApiFactoryBase, IAsyncLifetime
{
    private const string RequireAuthorizationEnvKey = "FeatureManagement__RequireAuthorization";

    private readonly string _dbName = $"failing-write-{Guid.NewGuid():N}";

    // Same reason LedgerApiFixture sets this in its constructor: Program.cs binds FeatureOptions eagerly, so
    // an env var is the one input read early enough to actually turn RequireAuthorization on for this host.
    // DRK-1242 stage 3 gave every write handler a real "caller must be authenticated" check (R5) — reaching
    // this fixture's simulated write failure now needs a real authenticated caller, not just any request.
    public FailingWriteApiFixture() => Environment.SetEnvironmentVariable(RequireAuthorizationEnvKey, "true");

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.RemoveAll<IDbContextOptionsConfiguration<CoreDbContext>>();
        services.RemoveAll<IConfigureOptions<DbContextOptions<CoreDbContext>>>();
        services.RemoveAll<IPostConfigureOptions<DbContextOptions<CoreDbContext>>>();
        services.RemoveAll<DbContextOptions<CoreDbContext>>();
        services.RemoveAll<CoreDbContext>();

        services.AddDbContextWithHook<CoreDbContext>((_, options) => options
            .UseInMemoryDatabase(_dbName)
            .UseAutoConfigModel([typeof(CoreDbContext).Assembly])
            .AddInterceptors(new ThrowingSaveChangesInterceptor()));

        services.RemoveAll<IMembershipService>();
        services.AddSingleton<IMembershipService, TestMembershipService>();

        LedgerCallerAuthHandler.Register(services);
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
}

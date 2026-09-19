using DKNet.EfCore.Hooks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using DKNet.Accounts.Domains.Features.Currencies.Entities;
using DKNet.Accounts.Domains.Services;
using DKNet.Accounts.Domains.Share;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.TestSupport;

/// <summary>
/// Shared host substitution for <c>WebApplicationFactory&lt;DKNet.Accounts.Api.Program&gt;</c> — swaps the real
/// DbContext for EF Core InMemory and the real membership service for <see cref="TestMembershipService"/>,
/// the same substitution both the xUnit integration suite and the Reqnroll BDD suite need. Suite-specific
/// concerns (Redis, per-scenario feature overrides, IAsyncLifetime) belong in a subclass.
/// </summary>
public abstract class TestApiFactoryBase(string? dbName = null) : WebApplicationFactory<DKNet.Accounts.Api.Program>
{
    private readonly string _dbName = dbName ?? $"tests-{Guid.NewGuid():N}";

    /// <summary>Captures log lines written by the app during a scenario/test, for asserting on log output.</summary>
    public TestLogCapture LogCapture { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureLogging(logging => logging.AddProvider(LogCapture));
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(BuildFeatureOverrides()));
        builder.ConfigureServices(ConfigureTestServices);
    }

    /// <summary>
    /// Base <c>FeatureManagement</c>/connection-string overrides both suites need. Override
    /// <see cref="AddFeatureOverrides" /> to extend rather than replacing this set.
    /// </summary>
    private Dictionary<string, string?> BuildFeatureOverrides()
    {
        var settings = new Dictionary<string, string?>
        {
            ["FeatureManagement:RunDbMigrationWhenAppStart"] = "false",
            ["FeatureManagement:EnableSwagger"] = "false",
            ["FeatureManagement:EnableAzureAppConfig"] = "false",
            ["ConnectionStrings:AppDb"] = DbConnectionString
        };
        AddFeatureOverrides(settings);
        return settings;
    }

    /// <summary>
    /// Value written to <c>ConnectionStrings:AppDb</c>. Program.cs branches on this value, so a subclass that
    /// swaps <see cref="ConfigureDatabase"/> for a real provider must override this too.
    /// </summary>
    protected virtual string DbConnectionString => "UseInMemory";

    /// <summary>Extension point for a subclass's additional configuration overrides.</summary>
    protected virtual void AddFeatureOverrides(IDictionary<string, string?> settings)
    {
    }

    /// <summary>
    /// Swaps the real DbContext for EF Core InMemory and the real membership service for
    /// <see cref="TestMembershipService"/>. Override to extend (call <c>base.ConfigureTestServices</c> first).
    /// </summary>
    protected virtual void ConfigureTestServices(IServiceCollection services)
    {
        services.RemoveAll<IDbContextOptionsConfiguration<CoreDbContext>>();
        services.RemoveAll<IConfigureOptions<DbContextOptions<CoreDbContext>>>();
        services.RemoveAll<IPostConfigureOptions<DbContextOptions<CoreDbContext>>>();
        services.RemoveAll<DbContextOptions<CoreDbContext>>();
        services.RemoveAll<CoreDbContext>();

        // AddDbContext (rather than AddDbContextWithHook) here would silently drop the DKNet events hook —
        // AddEvent-raised and [RaisesEvent]-declared domain events would never publish under this fixture.
        services.AddDbContextWithHook<CoreDbContext>((_, options) =>
        {
            ConfigureDatabase(options);
            options.UseAutoConfigModel([typeof(CoreDbContext).Assembly, typeof(Sequences).Assembly]);
        });

        services.RemoveAll<IMembershipService>();
        services.AddSingleton<IMembershipService, TestMembershipService>();
    }

    /// <summary>
    /// Chooses the EF Core provider. Default is InMemory; a subclass overrides to point at a real
    /// relational provider (e.g. a Testcontainers-hosted PostgreSQL instance).
    /// </summary>
    protected virtual void ConfigureDatabase(DbContextOptionsBuilder options) =>
        options.UseInMemoryDatabase(_dbName);

    public IServiceScope CreateScope() => Services.CreateScope();

    public virtual async Task ResetDatabaseAsync()
    {
        using var scope = CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.EnsureCreatedAsync();
        await SeedCurrenciesAsync();
        LogCapture.Clear();
    }

    /// <summary>
    /// The default InMemory reset (<see cref="ConfigureDatabase"/>) runs no migrations, so the
    /// <c>AddCurrencies</c> migration's <c>InsertData</c> seed rows never apply — and a subclass that resets
    /// a real, migrated database by truncating every table (see <c>BddApiFactory.ResetDatabaseAsync</c>) wipes
    /// those same seed rows out on every scenario. Either way, every SGD/USD/JPY-dependent test or BDD
    /// scenario would otherwise start refusing 422 UNSUPPORTED_CURRENCY the moment the static
    /// <c>Currency.All</c> lookup is gone — <c>protected</c> so both reset paths can call this (takes no
    /// <c>CoreDbContext</c> parameter and opens its own scope instead, since that type is internal to
    /// <c>DKNet.Accounts.Infra</c> and a protected member's signature can't expose it across assemblies).
    /// Same fixed ids/values as the migration, so test and production data agree. <see cref="Currency"/>'s
    /// public constructor always assigns a fresh <c>Guid</c> and leaves <c>CreatedBy</c>/<c>CreatedOn</c>
    /// unset (stamped on save by <c>DataOwnerHook</c>, which needs an <c>HttpContext</c> this setup path
    /// doesn't have) — both are overwritten directly through the change tracker before saving, the same
    /// mechanism EF itself uses to set a private-set property when materializing a row from the database.
    /// </summary>
    protected async Task SeedCurrenciesAsync()
    {
        using var scope = CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var seededOn = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);

        Seed(new Guid("c0de0001-0000-4000-8000-000000000702"), new Currency("SGD", "Singapore Dollar", 2));
        Seed(new Guid("c0de0001-0000-4000-8000-000000000840"), new Currency("USD", "US Dollar", 2));
        Seed(new Guid("c0de0001-0000-4000-8000-000000000392"), new Currency("JPY", "Japanese Yen", 0));

        await dbContext.SaveChangesAsync();
        return;

        void Seed(Guid id, Currency currency)
        {
            var entry = dbContext.Add(currency);
            entry.Property("Id").CurrentValue = id;
            entry.Property("CreatedBy").CurrentValue = "system";
            entry.Property("CreatedOn").CurrentValue = seededOn;
        }
    }
}

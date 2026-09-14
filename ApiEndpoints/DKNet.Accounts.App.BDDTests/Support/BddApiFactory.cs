using DKNet.AspCore.Idempotency;
using DKNet.AspCore.Idempotency.RedisStore;
using DKNet.AspCore.Idempotency.Store;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.BDDTests.Support;

public sealed class BddApiFactory(string? redisConnectionString = null) : TestApiFactoryBase("bdd-tests")
{
    protected override void AddFeatureOverrides(IDictionary<string, string?> settings)
    {
        // RequireAuthorization is NOT set here — Program.cs binds FeatureOptions eagerly, before this
        // dictionary ever reaches configuration, so it would be silently ineffective (see ApiHooks
        // .BeforeTestRun, which sets it via the one input read early enough: an environment variable).
        // The ledger scenarios exercise real scope-based authorization (§5), paired with
        // LedgerCallerAuthHandler below standing in for the real JWT bearer scheme.

        // Only the @redis scenario passes this. Setting it alone isn't enough to flip AppConfig.AddAppConfig's
        // redis-vs-fallback branch — WebApplicationFactory merges this config in after Program.cs's own
        // startup code already read it, so the ConfigureTestServices override below does the actual swap. Kept
        // here too so anything else that reads ConnectionStrings:Redis at runtime (rather than at startup)
        // sees the real value.
        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            settings["ConnectionStrings:Redis"] = redisConnectionString;
        }
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);

        LedgerCallerAuthHandler.Register(services);

        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            // Program.cs's own AddAppConfig already chose the in-memory idempotency fallback (it ran before
            // the config above was merged in), so replace that choice directly instead.
            services.RemoveAll<IIdempotencyKeyStore>();
            services.RemoveAll<IOptions<IdempotencyOptions>>();
            services.AddIdempotencyWithRedisStore(
                redisConnectionString,
                o => o.ConflictHandling = IdempotentConflictHandling.CachedResult);
        }
    }
}

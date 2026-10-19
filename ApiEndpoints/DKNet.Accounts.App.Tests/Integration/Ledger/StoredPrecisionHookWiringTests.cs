using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.Domains.Features.Transfers.Entities;
using DKNet.Accounts.Infra.Contexts;
using DKNet.EfCore.Hooks;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>DRK-2312 §6a D7 and D8: <see cref="StoredPrecisionHook"/> as the host wires it. It runs after DKNet's
/// audit hook (R3), and it runs on the context <c>TestApiFactoryBase</c> registers again for the InMemory host.</summary>
public sealed class StoredPrecisionHookWiringTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    [Fact]
    public void TheHookRunsAfterTheAuditHook()
    {
        using var scope = fixture.CreateScope();

        var hooks = scope.ServiceProvider.GetKeyedServices<IHookBaseAsync>(typeof(CoreDbContext).FullName)
            .Select(h => h.GetType().Name)
            .ToList();

        hooks.ShouldContain("EfCoreAuditHook");
        hooks.IndexOf(nameof(StoredPrecisionHook)).ShouldBeGreaterThan(hooks.IndexOf("EfCoreAuditHook"));
    }

    [Fact]
    public async Task ASaveOnTheTestFactorysContext_StoresTheTimeToTheMicrosecond()
    {
        using var scope = fixture.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var transfer = new Transfer(
            Guid.NewGuid(), Guid.NewGuid(), 1m, "SGD", "SGD", null, 0m, null, 1m,
            new DateTimeOffset(2026, 10, 19, 5, 45, 39, TimeSpan.Zero).AddTicks(1234569), "PayHub", $"k-{Guid.NewGuid():N}");
        // No caller here to stamp CreatedBy from, so setup writes it (as AccountTransferListQueryTests does).
        dbContext.Add(transfer).Property(nameof(Transfer.CreatedBy)).CurrentValue = "seed-setup";

        await dbContext.SaveChangesAsync();

        transfer.RecordedAt.ShouldBe(new DateTimeOffset(2026, 10, 19, 5, 45, 39, TimeSpan.Zero).AddTicks(1234560));
    }
}

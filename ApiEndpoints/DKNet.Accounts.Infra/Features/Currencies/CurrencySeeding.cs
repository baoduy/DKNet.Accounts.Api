using DKNet.EfCore.Extensions.Configurations;
using DKNet.Accounts.Domains.Features.Currencies.Entities;

namespace DKNet.Accounts.Infra.Features.Currencies;

/// <summary>
/// Inserts every <see cref="SeededCurrencies.All"/> currency a database does not have yet, picked up by
/// <c>UseAutoDataSeeding</c> and run on every <c>MigrateAsync</c> — so the seed survives the migrations
/// folder being regenerated. A currency already present (by code) is left exactly as it is, so a
/// deactivated or renamed seed currency is never reverted on restart.
/// Implements the interface rather than <see cref="DataSeedingConfiguration{TEntity}"/>: that base builds its
/// rows without a context, and <see cref="Currency"/>'s constructor always assigns a fresh id — the fixed id
/// and the audit columns are set through the change tracker instead, as <c>TestApiFactoryBase</c> does.
/// The migration context has no hooks, so nothing else stamps <c>CreatedBy</c> and no event is raised.
/// </summary>
internal sealed class CurrencySeeding : IDataSeedingConfiguration
{
    public int Order => 0;

    public Type EntityType => typeof(Currency);

    public Func<DbContext, bool, CancellationToken, Task> SeedAsync => async (context, _, cancellation) =>
    {
        var existing = await context.Set<Currency>().Select(c => c.Code).ToListAsync(cancellation);
        var missing = SeededCurrencies.All.Where(s => !existing.Contains(s.Code)).ToList();
        if (missing.Count == 0) return;

        foreach (var seeded in missing)
        {
            var entry = context.Add(new Currency(seeded.Code, seeded.Name, seeded.DecimalPlaces));
            entry.Property(nameof(Currency.Id)).CurrentValue = seeded.Id;
            entry.Property(nameof(Currency.CreatedBy)).CurrentValue = SeededCurrencies.SeededBy;
            entry.Property(nameof(Currency.CreatedOn)).CurrentValue = SeededCurrencies.SeededOn;
        }

        await context.SaveChangesAsync(cancellation);
    };
}

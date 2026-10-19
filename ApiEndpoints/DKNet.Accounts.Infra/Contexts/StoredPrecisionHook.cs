using DKNet.EfCore.Extensions.Snapshots;
using DKNet.EfCore.Hooks;

namespace DKNet.Accounts.Infra.Contexts;

/// <summary>
/// Drops the ticks below the microsecond from every time about to be written, keeping its offset, so the entity a
/// write answers with carries the value Postgres stores and a later read returns (DRK-2312). Postgres keeps
/// microseconds and the driver truncates the rest; the clock gives 100 ns. Only Added entries and the modified
/// properties of Modified entries are touched, so an unchanged property is never marked for UPDATE. Registered
/// after DKNet's audit hook, so its CreatedOn/UpdatedOn stamps are normalised too.
/// </summary>
internal sealed class StoredPrecisionHook : IBeforeSaveHookAsync
{
    public Task BeforeSaveAsync(SnapshotContext context, CancellationToken cancellationToken = default)
    {
        foreach (var entry in context.Entities.Select(e => e.Entry))
        {
            // An Unchanged or Deleted entry has no modified property, so it is never touched.
            foreach (var property in entry.Properties)
            {
                if ((entry.State == EntityState.Added || property.IsModified)
                    && property.CurrentValue is DateTimeOffset value)
                {
                    property.CurrentValue = value.AddTicks(-(value.Ticks % TimeSpan.TicksPerMicrosecond));
                }
            }
        }

        return Task.CompletedTask;
    }
}

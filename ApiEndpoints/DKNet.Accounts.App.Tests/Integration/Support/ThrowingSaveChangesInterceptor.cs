using Microsoft.EntityFrameworkCore.Diagnostics;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>
/// Simulates the purchase-order store "failing on every write" (the security-headers-on-a-500 scenario) by
/// throwing from the EF Core save pipeline itself, so the failure surfaces as a genuine unhandled exception
/// through <c>GlobalExceptionHandler</c> rather than a crafted test-only endpoint.
/// </summary>
/// <remarks>
/// <see cref="Enabled"/> defaults to <c>true</c> but is toggled off by <see cref="FailingWriteApiFixture"/>
/// while <c>ResetDatabaseAsync</c> seeds reference data (e.g. currencies) — that setup write must actually
/// reach the InMemory store, or fixture initialization itself throws before the test under test ever runs.
/// Re-enabled once setup completes, so the request the test issues still hits a genuine simulated failure.
/// </remarks>
public sealed class ThrowingSaveChangesInterceptor : SaveChangesInterceptor
{
    public bool Enabled { get; set; } = true;

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        if (!Enabled)
        {
            return result;
        }

        throw new InvalidOperationException("simulated store failure: every write fails");
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (!Enabled)
        {
            return ValueTask.FromResult(result);
        }

        throw new InvalidOperationException("simulated store failure: every write fails");
    }
}

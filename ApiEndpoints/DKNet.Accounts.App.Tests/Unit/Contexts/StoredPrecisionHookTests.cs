using DKNet.Accounts.Infra.Contexts;
using DKNet.EfCore.Extensions.Snapshots;
using Microsoft.EntityFrameworkCore;

namespace DKNet.Accounts.App.Tests.Unit.Contexts;

/// <summary>DRK-2312 §6a D2–D6: which times <see cref="StoredPrecisionHook"/> cuts to the microsecond before a save,
/// on a context of its own with no hooks wired, so a save here stores the value as given.</summary>
public sealed class StoredPrecisionHookTests : IAsyncDisposable
{
    private static readonly DateTimeOffset SubMicrosecond = new DateTimeOffset(2026, 10, 19, 5, 45, 39, TimeSpan.Zero).AddTicks(1234569);
    private static readonly DateTimeOffset Stored = new DateTimeOffset(2026, 10, 19, 5, 45, 39, TimeSpan.Zero).AddTicks(1234560);

    private readonly StampedDb _db = new();

    [Fact]
    public async Task AnAddedTime_LosesItsTicksBelowTheMicrosecond()
    {
        var stamped = _db.Add(new Stamped { At = SubMicrosecond }).Entity;

        await RunHookAsync();

        stamped.At.ShouldBe(Stored);
    }

    [Fact]
    public async Task AnAddedTimeInWholeMicroseconds_IsUnchanged()
    {
        var stamped = _db.Add(new Stamped { At = Stored, ClosedOn = Stored }).Entity;

        await RunHookAsync();

        stamped.At.ShouldBe(Stored);
        stamped.ClosedOn.ShouldBe(Stored);
    }

    [Fact]
    public async Task AnAddedNullTime_StaysNull_WhileAnAddedNullableTimeIsCut()
    {
        var withoutClose = _db.Add(new Stamped { At = Stored }).Entity;
        var withClose = _db.Add(new Stamped { At = Stored, ClosedOn = SubMicrosecond }).Entity;

        await RunHookAsync();

        withoutClose.ClosedOn.ShouldBeNull();
        withClose.ClosedOn.ShouldBe(Stored);
    }

    [Fact]
    public async Task AnAddedTimeWithAnOffset_KeepsItsOffset()
    {
        var singapore = TimeSpan.FromHours(8);
        var stamped = _db.Add(new Stamped { At = new DateTimeOffset(2026, 10, 19, 13, 45, 39, singapore).AddTicks(1234569) }).Entity;

        await RunHookAsync();

        stamped.At.ToString("O").ShouldBe("2026-10-19T13:45:39.1234560+08:00");
    }

    [Fact]
    public async Task AnUnchangedEntry_IsLeftAsItIs()
    {
        var stamped = await SavedAsync();

        await RunHookAsync();

        stamped.At.ShouldBe(SubMicrosecond);
        _db.Entry(stamped).State.ShouldBe(EntityState.Unchanged);
    }

    [Fact]
    public async Task ADeletedEntry_IsLeftAsItIs()
    {
        var stamped = await SavedAsync();
        _db.Remove(stamped);

        await RunHookAsync();

        stamped.At.ShouldBe(SubMicrosecond);
        _db.Entry(stamped).State.ShouldBe(EntityState.Deleted);
    }

    [Fact]
    public async Task AModifiedEntry_CutsOnlyTheTimesThatChanged()
    {
        var stamped = await SavedAsync();
        stamped.ClosedOn = SubMicrosecond;
        _db.ChangeTracker.DetectChanges();
        _db.Entry(stamped).State.ShouldBe(EntityState.Modified);

        await RunHookAsync();

        stamped.ClosedOn.ShouldBe(Stored);
        stamped.At.ShouldBe(SubMicrosecond);
        _db.Entry(stamped).Property(s => s.At).IsModified.ShouldBeFalse();
    }

    public async ValueTask DisposeAsync() => await _db.DisposeAsync();

    /// <summary>A row already stored with a sub-microsecond time, its entry now Unchanged.</summary>
    private async Task<Stamped> SavedAsync()
    {
        var stamped = _db.Add(new Stamped { At = SubMicrosecond }).Entity;
        await _db.SaveChangesAsync();
        _db.Entry(stamped).State.ShouldBe(EntityState.Unchanged);
        return stamped;
    }

    private async Task RunHookAsync()
    {
        await using var snapshot = new SnapshotContext(_db);
        snapshot.Initialize();
        await new StoredPrecisionHook().BeforeSaveAsync(snapshot);
    }

    private sealed class Stamped
    {
        public int Id { get; set; }

        public DateTimeOffset At { get; set; }

        public DateTimeOffset? ClosedOn { get; set; }
    }

    private sealed class StampedDb : DbContext
    {
        public DbSet<Stamped> Stamped => Set<Stamped>();

        protected override void OnConfiguring(DbContextOptionsBuilder options) =>
            options.UseInMemoryDatabase($"stored-precision-{Guid.NewGuid():N}");
    }
}

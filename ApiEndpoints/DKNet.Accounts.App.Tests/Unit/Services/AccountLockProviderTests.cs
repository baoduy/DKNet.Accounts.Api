using DKNet.Accounts.Infra.Services;

namespace DKNet.Accounts.App.Tests.Unit.Services;

/// <summary>
/// Direct coverage of the per-account lock's own guarantees: a second acquire for the same account waits
/// until the first is released, a different account is never blocked by it, and a bounded wait that can't be
/// satisfied throws rather than hanging forever.
/// </summary>
public class AccountLockProviderTests
{
    [Fact]
    public async Task SecondAcquire_ForTheSameAccount_WaitsUntilTheFirstIsReleased()
    {
        var provider = new AccountLockProvider();
        var accountId = Guid.NewGuid();
        var order = new List<string>();

        var first = await provider.AcquireAsync(accountId, TimeSpan.FromSeconds(5), CancellationToken.None);

        var secondTask = Task.Run(async () =>
        {
            var second = await provider.AcquireAsync(accountId, TimeSpan.FromSeconds(5), CancellationToken.None);
            order.Add("second-acquired");
            second.Dispose();
        });

        await Task.Delay(50);
        order.ShouldBeEmpty("the second acquire must still be waiting");

        order.Add("first-released");
        first.Dispose();

        await secondTask;
        order.ShouldBe(["first-released", "second-acquired"]);
    }

    [Fact]
    public async Task DifferentAccounts_AreNeverBlockedByEachOther()
    {
        var provider = new AccountLockProvider();

        using var first = await provider.AcquireAsync(Guid.NewGuid(), TimeSpan.FromSeconds(5), CancellationToken.None);
        using var second = await provider.AcquireAsync(Guid.NewGuid(), TimeSpan.FromMilliseconds(50), CancellationToken.None);

        // Reaching this line at all proves the second acquire did not wait on the first account's lock.
        second.ShouldNotBeNull();
    }

    [Fact]
    public async Task Acquire_ThrowsTimeoutException_WhenTheBoundIsExceededWhileAnotherHolderKeepsTheLock()
    {
        var provider = new AccountLockProvider();
        var accountId = Guid.NewGuid();
        using var held = await provider.AcquireAsync(accountId, TimeSpan.FromSeconds(5), CancellationToken.None);

        await Should.ThrowAsync<TimeoutException>(
            () => provider.AcquireAsync(accountId, TimeSpan.FromMilliseconds(50), CancellationToken.None));
    }

    [Fact]
    public async Task Dispose_IsIdempotent_ReleasingTheGateOnlyOnce()
    {
        var provider = new AccountLockProvider();
        var accountId = Guid.NewGuid();

        var handle = await provider.AcquireAsync(accountId, TimeSpan.FromSeconds(5), CancellationToken.None);
        handle.Dispose();
        handle.Dispose();

        // A double Dispose that (wrongly) released the semaphore's single slot twice would let two concurrent
        // acquires both succeed immediately; this proves only one ever does.
        using var next = await provider.AcquireAsync(accountId, TimeSpan.FromSeconds(5), CancellationToken.None);
        await Should.ThrowAsync<TimeoutException>(
            () => provider.AcquireAsync(accountId, TimeSpan.FromMilliseconds(50), CancellationToken.None));
    }
}

using System.Collections.Concurrent;

namespace DKNet.Accounts.Infra.Services;

/// <summary>
/// Process-local, per-account mutual exclusion — a row lock's in-process equivalent, portable across every
/// EF Core provider this service runs against (including the EF Core InMemory provider the test suite uses,
/// which offers neither real transactions nor unique-index enforcement to lean on instead). One
/// <see cref="SemaphoreSlim"/> per account id, created on first use and kept for the process's lifetime.
/// </summary>
/// <remarks>
/// ponytail: single-process lock — correct for one running instance, not for a horizontally-scaled
/// deployment. Scaling out needs a DB-level advisory lock (e.g. Postgres <c>pg_advisory_xact_lock</c>) or an
/// optimistic unique-(AccountId,Position)-index-plus-bounded-retry scheme instead; the unique indexes this
/// stage's EF configs still add stay as defense-in-depth either way.
/// </remarks>
internal sealed class AccountLockProvider : IAccountLockProvider
{
    // ponytail: entries are never evicted, so this grows by one SemaphoreSlim per distinct account ever
    // posted against, for the process's lifetime — fine at the stated ceiling (<100 postings/sec against a
    // bounded account set); an LRU/expiry eviction would be needed well before that stops holding.
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _locks = new();

    public async Task<IDisposable> AcquireAsync(Guid accountId, TimeSpan timeout, CancellationToken cancellationToken)
    {
        var gate = _locks.GetOrAdd(accountId, static _ => new SemaphoreSlim(1, 1));
        var acquired = await gate.WaitAsync(timeout, cancellationToken).ConfigureAwait(false);
        if (!acquired)
        {
            throw new TimeoutException($"Timed out waiting for the lock on account {accountId}.");
        }

        return new Releaser(gate);
    }

    private sealed class Releaser(SemaphoreSlim gate) : IDisposable
    {
        private int _released;

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _released, 1) == 0)
            {
                gate.Release();
            }
        }
    }
}

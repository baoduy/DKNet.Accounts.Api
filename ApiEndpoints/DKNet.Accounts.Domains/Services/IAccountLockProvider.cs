namespace DKNet.Accounts.Domains.Services;

/// <summary>
/// Serializes the read-validate-apply-persist critical section of a posting write per account, so concurrent
/// postings against the same account are queued rather than racing (a DB row lock's in-process equivalent —
/// see <c>DKNet.Accounts.Infra.Services.AccountLockProvider</c> for the ceiling this implies). A batch acquires
/// every distinct account it touches, always in ascending id order, before mutating any of them, so two
/// concurrent batches that share accounts can never deadlock each other.
/// </summary>
public interface IAccountLockProvider : IDomainService
{
    /// <summary>
    /// Waits (bounded by <paramref name="timeout"/>) to acquire the lock for <paramref name="accountId"/> and
    /// returns a handle that releases it on <see cref="IDisposable.Dispose"/>. Throws
    /// <see cref="TimeoutException"/> if the lock is not acquired within <paramref name="timeout"/>.
    /// </summary>
    Task<IDisposable> AcquireAsync(Guid accountId, TimeSpan timeout, CancellationToken cancellationToken);
}

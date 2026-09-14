using DKNet.Accounts.Domains.Services;

namespace DKNet.Accounts.App.Tests.Integration.Support;

/// <summary>Simulates every account lock acquire timing out, so a request reliably reaches the "could not
/// acquire the account lock in time" refusal path in Record/RecordBatch/Reverse.</summary>
public sealed class AlwaysTimesOutLockProvider : IAccountLockProvider
{
    public Task<IDisposable> AcquireAsync(Guid accountId, TimeSpan timeout, CancellationToken cancellationToken) =>
        throw new TimeoutException("simulated: could not acquire the account lock in time");
}

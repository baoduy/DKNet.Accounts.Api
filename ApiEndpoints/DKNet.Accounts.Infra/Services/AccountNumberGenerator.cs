using System.Globalization;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.Infra.Services;

internal sealed class AccountNumberGenerator(CoreDbContext dbContext)
    : SequenceService(dbContext, Sequences.AccountNumber), IAccountNumberGenerator
{
    private static long _fallback;

    /// <summary>
    /// Yields the 10-digit suffix an account number is built from. <see cref="SequenceService"/>'s own
    /// non-relational fallback returns a 36-character GUID, which is outside the 3-10 characters an account
    /// number's suffix may span — so on a non-relational provider this counts in-process instead, keeping
    /// in-memory-backed runs on the same number shape PostgreSQL produces.
    /// </summary>
    // ponytail: in-process counter, so it is unique per run rather than per database — enough for the
    // in-memory provider it exists for. If a non-relational provider ever backs a real deployment, this
    // needs to read the high-water mark from the store on start.
    public override async ValueTask<string> NextValueAsync() =>
        dbContext.IsNpgsql()
            ? await base.NextValueAsync()
            : Interlocked.Increment(ref _fallback).ToString("0000000000", CultureInfo.InvariantCulture);
}

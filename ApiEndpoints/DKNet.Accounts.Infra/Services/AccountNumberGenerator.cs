using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.Infra.Services;

internal sealed class AccountNumberGenerator(CoreDbContext dbContext)
    : SequenceService(dbContext, Sequences.AccountNumber), IAccountNumberGenerator;

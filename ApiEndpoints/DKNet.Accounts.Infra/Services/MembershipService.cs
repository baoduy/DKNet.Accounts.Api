using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.Infra.Services;

internal sealed class MembershipService(CoreDbContext dbContext)
    : SequenceService(dbContext, Sequences.Membership), IMembershipService;
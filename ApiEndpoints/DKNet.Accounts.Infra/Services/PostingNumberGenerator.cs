using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.Infra.Services;

internal sealed class PostingNumberGenerator(CoreDbContext dbContext)
    : SequenceService(dbContext, Sequences.PostingNumber), IPostingNumberGenerator;

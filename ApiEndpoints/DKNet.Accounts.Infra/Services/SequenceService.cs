namespace DKNet.Accounts.Infra.Services;

internal abstract class SequenceService(DbContext dbContext, Sequences sequence) : ISequenceServices
{
    #region Methods

    /// <summary>
    /// Whether the database holds the sequences: PostgreSQL and SQL Server do; a non-relational provider
    /// (InMemory) does not.
    /// </summary>
    protected bool HasDbSequences => dbContext.IsNpgsql() || dbContext.IsSqlServer();

    public virtual async ValueTask<string> NextValueAsync() =>
        HasDbSequences
            ? await dbContext.NextSeqValueWithFormat(sequence)
            : Guid.NewGuid().ToString();

    #endregion
}
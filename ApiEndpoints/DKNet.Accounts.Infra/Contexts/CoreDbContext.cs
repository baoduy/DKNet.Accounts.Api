using DKNet.EfCore.Abstractions.Entities;
using DKNet.EfCore.AuditLogs;
using DKNet.Accounts.Share.Options;

namespace DKNet.Accounts.Infra.Contexts;

/// <param name="options"></param>
/// <param name="currentUserProviders"></param>
/// <param name="outbound">The outbound bus settings; registered only when the bus is on.</param>
internal class CoreDbContext(
    DbContextOptions options,
    IEnumerable<ICurrentUserProvider>? currentUserProviders = null,
    MessageBusOptions? outbound = null)
    : DbContext(options)
{
    private readonly ICurrentUserProvider? _currentUserProvider = currentUserProviders?.FirstOrDefault();

    #region Methods

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        EnsureOwnershipResolvable();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        EnsureOwnershipResolvable();
        if (outbound is null)
        {
            return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        }

        return Database.CurrentTransaction is not null
            ? SaveWithEventsAsync(acceptAllChangesOnSuccess, cancellationToken)
            : SaveInOneTransactionAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        EnsureOwnershipResolvable();
        return base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Set by <c>EventPublisher</c> when an outbound event of the running save could not be stored in the outbox.
    /// </summary>
    internal Exception? OutboundEventFailure { get; set; }

    /// <summary>
    /// With the outbound bus on, the save and the outbox rows its events write (the DKNet event hook publishes them
    /// while the save is still open) commit in ONE transaction (DRK-1773 R1): a failed or rolled-back save leaves no
    /// event behind. Runs inside the execution strategy, which refuses a user-opened transaction otherwise; changes
    /// are accepted only after the commit, so a retried attempt saves them again. A save joining a caller's own
    /// transaction takes no transaction of its own — its outbox rows commit or roll back with the caller's.
    /// </summary>
    private Task<int> SaveInOneTransactionAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken) =>
        Database.CreateExecutionStrategy().ExecuteAsync(async token =>
        {
            await using var transaction = await Database.BeginTransactionAsync(token);
            var saved = await SaveWithEventsAsync(false, token);
            await transaction.CommitAsync(token);

            if (acceptAllChangesOnSuccess)
            {
                ChangeTracker.AcceptAllChanges();
            }

            return saved;
        }, cancellationToken);

    /// <summary>
    /// Saves, then refuses to let the transaction commit when an event of this save could not be stored: the DKNet
    /// hook only logs a publisher failure, and a failed outbox insert leaves the PostgreSQL transaction aborted, so
    /// its commit would silently roll the change back behind a successful save. Neither is kept instead.
    /// </summary>
    private async Task<int> SaveWithEventsAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken)
    {
        OutboundEventFailure = null;
        var saved = await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        return OutboundEventFailure is null
            ? saved
            : throw new InvalidOperationException(
                "An outbound event of this save could not be stored, so the save is not kept.", OutboundEventFailure);
    }

    /// <summary>
    /// Fails closed, before EF Core attempts the insert, when an authenticated caller's ownership key cannot be
    /// resolved and a new row would be left with no <see cref="IAuditedProperties.CreatedBy"/> — otherwise EF
    /// Core's own required-property check throws a raw <see cref="DbUpdateException"/> that leaks column/entity
    /// names into the response (DRK-899 R3: null key means "no stamp", never a crash).
    /// </summary>
    private void EnsureOwnershipResolvable()
    {
        if (_currentUserProvider is null) return;
        if (!string.IsNullOrEmpty(_currentUserProvider.GetCurrentUser())) return;

        var hasUnattributableInsert = ChangeTracker.Entries()
            .Any(e => e.State == EntityState.Added
                      && e.Entity is IAuditedProperties { CreatedBy: null or "" }
                      && e.Metadata.FindProperty(nameof(IAuditedProperties.CreatedBy)) is { IsNullable: false });

        if (hasUnattributableInsert) throw new OwnershipRequiredException();
    }

    #endregion
}

using DKNet.Accounts.AppServices.Share.Generics;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.EfCore.Specifications.Definitions;
using DKNet.EfCore.Specifications.Repositories;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage;

namespace DKNet.Accounts.App.Tests.Unit.Generics;

/// <summary>
/// Hand-written <see cref="IRepositorySpec"/> double serving <see cref="AccountGroup"/> rows from an
/// in-memory list — the outbound port <see cref="ModelSpecGenericStatusCountsExtensions.GetStatusCounts{TEntity}"/>
/// needs to run its real dynamic-LINQ grouping against. Every member besides <see cref="Query{TEntity}"/> is
/// unreachable from that method and throws if ever called.
/// </summary>
file sealed class FakeAccountGroupRepository(IReadOnlyList<AccountGroup> groups) : IRepositorySpec
{
    public IQueryable<TEntity> Query<TEntity>(ISpecification<TEntity> spec) where TEntity : class
    {
        if (typeof(TEntity) != typeof(AccountGroup))
        {
            throw new NotSupportedException($"{nameof(FakeAccountGroupRepository)} only serves {nameof(AccountGroup)} queries.");
        }

        var query = groups.Cast<TEntity>().AsQueryable();
        return spec.FilterQuery is null ? query : query.Where(spec.FilterQuery);
    }

    public IQueryable<TModel> Query<TEntity, TModel>(ISpecification<TEntity> spec)
        where TEntity : class where TModel : class => throw new NotSupportedException();

    public ValueTask AddAsync<TEntity>(TEntity entity, CancellationToken cancellationToken = default) where TEntity : class =>
        throw new NotSupportedException();

    public ValueTask AddRangeAsync<TEntity>(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default)
        where TEntity : class => throw new NotSupportedException();

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default) =>
        throw new NotSupportedException();

    public void Delete<TEntity>(TEntity entity) where TEntity : class => throw new NotSupportedException();

    public Task<int> BulkDeleteAsync<TEntity>(
        System.Linq.Expressions.Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
        where TEntity : class => throw new NotSupportedException();

    public EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class => throw new NotSupportedException();

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => throw new NotSupportedException();

    public Task<int> UpdateAsync<TEntity>(TEntity entity, CancellationToken cancellationToken = default) where TEntity : class =>
        throw new NotSupportedException();

    public Task UpdateRangeAsync<TEntity>(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default)
        where TEntity : class => throw new NotSupportedException();
}

/// <summary>
/// DRK-1662 §7 @unit: pins <c>GetStatusCounts</c>'s existing zero-backfill behaviour (§2 — already correct,
/// untouched by this slice's §3) against regression now that the console's status-count routes are about to
/// give it live callers. Drives the real dynamic-LINQ grouping in
/// <see cref="ModelSpecGenericStatusCountsExtensions.GetStatusCounts{TEntity}"/> against an in-memory
/// <see cref="IRepositorySpec"/> fake (no database) rather than the entity's own filter predicate alone,
/// since the value under test — every enum member present, unseen ones at zero — lives in the post-query
/// backfill loop, not in <see cref="ModelSpecStatusCounts{TEntity}"/>'s <c>FilterQuery</c>.
/// </summary>
public class GetStatusCountsZeroBackfillTests
{
    #region Methods

    [Fact]
    public async Task GetStatusCounts_ShouldListClosedAtZero_WhenNoGroupHasEverBeenClosed()
    {
        var groups = new List<AccountGroup>
        {
            new("ACT1", "Active One", null, AccountGroupType.Customer, "owner", null),
            new("ACT2", "Active Two", null, AccountGroupType.Customer, "owner", null)
        };
        var repository = new FakeAccountGroupRepository(groups);
        var property = new StatusPropertyInfo(nameof(AccountGroup.Status), typeof(AccountGroupStatus));

        var results = await repository.GetStatusCounts<AccountGroup>(property, new GenericStatusCountsParameters());

        results.ShouldContain(r =>
            string.Equals(r.Status, nameof(AccountGroupStatus.Closed), StringComparison.OrdinalIgnoreCase) && r.Count == 0);
        results.ShouldContain(r =>
            string.Equals(r.Status, nameof(AccountGroupStatus.Active), StringComparison.OrdinalIgnoreCase) && r.Count == 2);
    }

    #endregion
}

using DKNet.EfCore.Specifications.Definitions;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using LinqKit;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Specs;

internal sealed class SpecGetAccountGroup : Specification<AccountGroup>
{
    public SpecGetAccountGroup(Guid? byId = null, string? byCode = null)
    {
        var predicate = CreatePredicate();

        if (byId is not null)
        {
            predicate = predicate.And(g => g.Id == byId);
        }

        if (!string.IsNullOrEmpty(byCode))
        {
            predicate = predicate.And(g => g.Code == byCode);
        }

        if (byId is null && string.IsNullOrEmpty(byCode))
        {
            // No filter supplied would otherwise compile to WHERE FALSE (an unstarted predicate builder) —
            // this makes "no filter" list everything instead of silently matching nothing.
            predicate = predicate.And(_ => true);
        }

        WithFilter(predicate);
    }
}

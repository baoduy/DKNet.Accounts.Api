using DKNet.EfCore.Specifications.Definitions;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using LinqKit;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Specs;

/// <summary>
/// Filters group listing by type, status, parent and code — each independently, per §3 row 7 ("Group listing
/// filters by type and status independently — each filter must work on its own, not only in combination").
/// </summary>
internal sealed class SpecListAccountGroups : Specification<AccountGroup>
{
    public SpecListAccountGroups(
        AccountGroupType? type = null,
        AccountGroupStatus? status = null,
        Guid? parentId = null,
        string? code = null)
    {
        var predicate = CreatePredicate();
        var anyFilter = false;

        if (type is not null)
        {
            predicate = predicate.And(g => g.Type == type);
            anyFilter = true;
        }

        if (status is not null)
        {
            predicate = predicate.And(g => g.Status == status);
            anyFilter = true;
        }

        if (parentId is not null)
        {
            predicate = predicate.And(g => g.ParentId == parentId);
            anyFilter = true;
        }

        if (!string.IsNullOrEmpty(code))
        {
            predicate = predicate.And(g => g.Code == code);
            anyFilter = true;
        }

        if (!anyFilter)
        {
            predicate = predicate.And(_ => true);
        }

        WithFilter(predicate);
        AddOrderBy(g => g.Code);
    }
}

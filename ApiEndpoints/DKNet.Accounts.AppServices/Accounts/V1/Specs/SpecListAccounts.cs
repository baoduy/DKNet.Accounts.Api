using DKNet.EfCore.Specifications.Definitions;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using LinqKit;

namespace DKNet.Accounts.AppServices.Accounts.V1.Specs;

/// <summary>
/// Filters account listing by group, currency and status — each independently (§3 row 7: "account listing
/// filters by groupId, currency and status independently").
/// </summary>
internal sealed class SpecListAccounts : Specification<Account>
{
    public SpecListAccounts(Guid? groupId = null, string? currency = null, AccountStatus? status = null)
    {
        var predicate = CreatePredicate();
        var anyFilter = false;

        if (groupId is not null)
        {
            predicate = predicate.And(a => a.GroupId == groupId);
            anyFilter = true;
        }

        if (!string.IsNullOrEmpty(currency))
        {
            predicate = predicate.And(a => a.CurrencyCode == currency);
            anyFilter = true;
        }

        if (status is not null)
        {
            predicate = predicate.And(a => a.Status == status);
            anyFilter = true;
        }

        if (!anyFilter)
        {
            predicate = predicate.And(_ => true);
        }

        WithFilter(predicate);
        AddOrderBy(a => a.AccountNumber);
    }
}

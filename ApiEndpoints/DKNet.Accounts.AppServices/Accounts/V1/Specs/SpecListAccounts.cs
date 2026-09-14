using DKNet.EfCore.Specifications.Definitions;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using LinqKit;
// The enclosing DKNet.Accounts.AppServices.Accounts.V1 namespace declares its own AccountStatus (the DTO
// enum) — a plain `using` for the Domain namespace above loses that name clash to the enclosing namespace,
// so the Domain entity's enum needs an alias to bind unambiguously.
using DomainAccountStatus = DKNet.Accounts.Domains.Features.Accounts.Entities.AccountStatus;

namespace DKNet.Accounts.AppServices.Accounts.V1.Specs;

/// <summary>
/// Filters account listing by group, currency and status — each independently (§3 row 7: "account listing
/// filters by groupId, currency and status independently").
/// </summary>
internal sealed class SpecListAccounts : Specification<Account>
{
    public SpecListAccounts(Guid? groupId = null, string? currency = null, DomainAccountStatus? status = null)
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

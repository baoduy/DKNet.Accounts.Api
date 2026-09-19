using DKNet.EfCore.Specifications.Definitions;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.AppServices.Accounts.V1.Specs;

internal sealed class SpecGetAccount : Specification<Account>
{
    public SpecGetAccount(Guid? byId = null, string? byAccountNumber = null)
    {
        var predicate = CreatePredicate();

        if (byId is not null)
        {
            predicate = predicate.And(a => a.Id == byId);
        }

        if (!string.IsNullOrEmpty(byAccountNumber))
        {
            predicate = predicate.And(a => a.AccountNumber == byAccountNumber);
        }

        if (byId is null && string.IsNullOrEmpty(byAccountNumber))
        {
            predicate = predicate.And(_ => true);
        }

        WithFilter(predicate);
    }
}

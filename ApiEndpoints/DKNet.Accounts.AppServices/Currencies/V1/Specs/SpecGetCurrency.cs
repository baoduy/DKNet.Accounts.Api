using DKNet.EfCore.Specifications.Definitions;
using DKNet.Accounts.Domains.Features.Currencies.Entities;

namespace DKNet.Accounts.AppServices.Currencies.V1.Specs;

internal sealed class SpecGetCurrency : Specification<Currency>
{
    public SpecGetCurrency(Guid? byId = null, string? byCode = null)
    {
        var predicate = CreatePredicate();

        if (byId is not null)
        {
            predicate = predicate.And(c => c.Id == byId);
        }

        if (!string.IsNullOrEmpty(byCode))
        {
            predicate = predicate.And(c => c.Code == byCode);
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

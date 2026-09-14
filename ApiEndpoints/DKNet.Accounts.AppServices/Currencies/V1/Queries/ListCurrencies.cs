using DKNet.Accounts.Domains.Share;

namespace DKNet.Accounts.AppServices.Currencies.V1.Queries;

/// <summary>
/// The service's reference currency set (R5: SGD, USD and JPY at minimum). Sourced from the in-process
/// <see cref="Currency.All"/> list rather than a persisted table — it is fixed, read-only reference data with
/// no query or join requirement of its own, so a DB round trip buys nothing a static list doesn't already
/// give for free. ponytail: revisit if a future stage needs currencies editable without a redeploy.
/// </summary>
public sealed record ListCurrenciesQuery : Fluents.Queries.IWitResponse<IReadOnlyCollection<CurrencyDto>>;

internal sealed class ListCurrenciesQueryHandler
    : Fluents.Queries.IHandler<ListCurrenciesQuery, IReadOnlyCollection<CurrencyDto>>
{
    public Task<IReadOnlyCollection<CurrencyDto>?> OnHandle(
        ListCurrenciesQuery request,
        CancellationToken cancellationToken)
    {
        IReadOnlyCollection<CurrencyDto> dtos = Currency.All
            .Select(c => new CurrencyDto { Code = c.Code, DecimalPlaces = c.DecimalPlaces })
            .ToList();

        return Task.FromResult<IReadOnlyCollection<CurrencyDto>?>(dtos);
    }
}

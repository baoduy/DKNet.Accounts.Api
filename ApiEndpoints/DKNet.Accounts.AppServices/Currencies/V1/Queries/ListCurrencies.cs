namespace DKNet.Accounts.AppServices.Currencies.V1.Queries;

/// <summary>
/// The service's reference currency set (R5: SGD, USD and JPY at minimum).
/// </summary>
public sealed record ListCurrenciesQuery : Fluents.Queries.IWitResponse<IReadOnlyCollection<CurrencyDto>>;

internal sealed class ListCurrenciesQueryHandler
    : Fluents.Queries.IHandler<ListCurrenciesQuery, IReadOnlyCollection<CurrencyDto>>
{
    public Task<IReadOnlyCollection<CurrencyDto>?> OnHandle(
        ListCurrenciesQuery request,
        CancellationToken cancellationToken) =>
        throw new NotImplementedException();
}

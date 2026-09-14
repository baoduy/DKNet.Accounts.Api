using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.AppServices.Currencies.V1.Queries;

namespace DKNet.Accounts.Api.ApiEndpoints.Currencies;

internal sealed class CurrenciesV1Endpoint : IEndpointConfig
{
    public int Version => 1;

    public string GroupEndpoint => "/currencies";

    public void Map(RouteGroupBuilder group)
    {
        group.MapGet("/", async (
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var currencies = await bus.Send(new ListCurrenciesQuery(), cancellationToken: ct);
                return Results.Ok(currencies);
            })
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("List supported currencies and their decimal places.");
    }
}

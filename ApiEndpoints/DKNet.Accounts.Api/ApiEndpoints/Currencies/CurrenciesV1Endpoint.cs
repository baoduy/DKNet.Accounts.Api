using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.AppServices.Crud;

namespace DKNet.Accounts.Api.ApiEndpoints.Currencies;

// Group-level scope declaration (DRK-1556 §3 row 3): every route this group registers for GET needs
// accounts.read, and for POST/PUT/DELETE needs accounts.write — [CrudAction] routes (Activate/Deactivate)
// emit as POST (see the generated AccountGroupCrudEndpointExtensions for the same pattern), so they're
// covered by the write scope too.
[EndpointGroupScope(ScopeNames.AccountsRead, EndpointHttpMethods.Get)]
[EndpointGroupScope(ScopeNames.AccountsWrite, EndpointHttpMethods.Post, EndpointHttpMethods.Put)]
internal sealed class CurrenciesV1Endpoint : IEndpointConfig
{
    public int Version => 1;

    public string GroupEndpoint => "/currencies";

    public void Map(RouteGroupBuilder group)
    {
        // Create/List/GetById plus the [CrudUpdate] Rename and the two [CrudAction] members
        // (Activate/Deactivate) all register through one generated composite. Delete is excluded — the
        // generator emits MapDeleteById unconditionally even though Currency declares no delete.
        group.MapCurrencyCrud(o => o.Exclude(CrudOp.Delete));
    }
}

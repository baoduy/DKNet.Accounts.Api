using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.AppServices.AccountGroups.V1;
using DKNet.Accounts.AppServices.AccountGroups.V1.Queries;
using DKNet.Accounts.AppServices.Crud;

namespace DKNet.Accounts.Api.ApiEndpoints.AccountGroups;

internal sealed class AccountGroupsV1Endpoint : IEndpointConfig
{
    public int Version => 1;

    public string GroupEndpoint => "/account-groups";

    public void Map(RouteGroupBuilder group)
    {
        // Group-level scope declaration (DRK-1498 §3 rows 1-2, 5): every route this group registers for GET
        // needs accounts.read, and for POST/PUT/DELETE needs accounts.write, unless the route names its own
        // scope (none here do) or is anonymous.
        group.DeclareGroupScope(ScopeNames.AccountsRead, "GET")
            .DeclareGroupScope(ScopeNames.AccountsWrite, "POST", "PUT", "DELETE");

        // Create/List/GetById/Delete plus the three [CrudUpdate] members (Rename, ChangeDescription,
        // ChangeMetadata) and Activate register through one generated composite (DRK-1440 §3 rows 1-3;
        // DRK-1522 §3 row 11: Close's GROUP_HOLDS_BALANCE refusal now runs as a command failure inside
        // CloseAccountGroupHandler, not a validator failure, so a generated route can reach it). Rename must
        // stay the first [CrudUpdate] declared on AccountGroup or it loses its plain "{id}" PUT route. Close
        // itself is excluded here and hand-mapped below with an explicit "{id:guid}" pattern (pr-reviewer
        // round 1, finding 7): the generated composite's own default is the looser "{id}", which answers a
        // malformed id 400 instead of the 404 this service has always answered and the README still
        // documents — the same reason PostingsV1Endpoint.MapGetById keeps its own explicit "{id:guid}"
        // against that same default.
        group.MapAccountGroupCrud(o => o
                .Exclude("Close")
                .Configure("Create", b => b.WithDescription("Create an account group."))
                .Configure("GetList", b => b.WithDescription(
                    "List account groups. Filter as 'field:operation:value', e.g. filter=Type:Equal:Customer."))
                .Configure("GetById", b => b.WithDescription("Read one account group."))
                .Configure("Rename", b => b.WithDescription("Rename an account group."))
                .Configure("ChangeDescription", b => b.WithDescription("Change an account group's description."))
                .Configure("ChangeMetadata", b => b.WithDescription("Change an account group's metadata."))
                .Configure("Delete", b => b.WithDescription("Delete an account group. Refused while the group still holds any account."))
                .Configure("Activate", b => b.WithDescription("Reactivate a closed account group.")));

        group.MapParameterlessActionById<CloseAccountGroupRequest, Guid, AccountGroupDto>("{id:guid}/close", "POST")
            .WithDescription("Close an account group. Refused while any account it holds still carries a balance.");

        group.MapGet("{id:guid}/balances", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var balances = await bus.Send(new GetAccountGroupBalancesQuery { Id = id }, cancellationToken: ct);
                return Results.Ok(balances);
            })
            .WithDescription("Read a group's total balances, one line per currency — never combined.");
    }
}

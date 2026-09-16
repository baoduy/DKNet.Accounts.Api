using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.AccountGroups.V1;
using DKNet.Accounts.AppServices.AccountGroups.V1.Actions;
using DKNet.Accounts.AppServices.AccountGroups.V1.Queries;
using DKNet.Accounts.AppServices.Crud;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.Api.ApiEndpoints.AccountGroups;

internal sealed class AccountGroupsV1Endpoint : IEndpointConfig
{
    public int Version => 1;

    public string GroupEndpoint => "/account-groups";

    public void Map(RouteGroupBuilder group)
    {
        // Create (GEN-REQ, DRK-1277 §3 row 9): CreateAccountGroupRequest is generated from AccountGroup's
        // [CrudCreate] constructor (DKNet.Accounts.AppServices.Crud), but the ROUTE stays hand-mapped — the
        // generated Map{Entity}Crud composite's MapPost hardcodes the package's default FluentResults->IResult
        // conversion (400 on any failure), which cannot express this service's LedgerErrors->422 mapping (R3,
        // LedgerResultResponseExtensions.ToLedgerResponse). Handler stays hand-written for the duplicate-code
        // pre-check.
        group.MapPost("/", async (
                CreateAccountGroupRequest req,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var result = await bus.Send(req, cancellationToken: ct);
                return result.ToLedgerResponse(isCreated: true);
            })
            .RequireScope(group, ScopeNames.AccountsWrite)
            .Produces<AccountGroupDto>(StatusCodes.Status201Created)
            .WithDescription("Create an account group.");

        // List (GEN, DRK-1277 §11/§12): a list is not a mutation, but the owner's widened mandate takes the
        // generated list syntax/envelope wherever a caller can still ask everything the old shape let it ask
        // (R4) — plain generic entity mapper, no SlimBus handler, R3 doesn't apply.
        group.MapGetList<AccountGroup, Guid, AccountGroupDto>()
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("List account groups. Filter as 'field:operation:value', e.g. filter=Type:Equal:Customer.");

        // Get-by-id (GEN, DRK-1277 §3 row 9): plain generic entity mapper — no SlimBus handler or [CrudCreate]
        // /[CrudUpdate]/[CrudAction] involved, so none of the Map{Entity}Crud caveats above apply. The
        // explicit "{id:guid}" endpoint keeps the same route pattern this used before (the mapper's own
        // default is the looser "{id}").
        group.MapGetById<AccountGroup, Guid, AccountGroupDto>("{id:guid}")
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("Read one account group.");

        // Rename (GEN, DRK-1277 §11/§12): [CrudUpdate] on AccountGroup.Rename — the first such member on the
        // type, so the generator lands it on the plain "{id}" route. Generated request AND handler; only the
        // route registration is a direct call instead of going through Map{Entity}Crud (whose composite
        // discards the RouteHandlerBuilder it needs to chain .RequireScope onto) — MapPutById itself returns
        // a chainable builder, so no hand-written plumbing is added. Rename's only failure mode is 404
        // (NotFoundError, mapped by the default .Response()), so R3 does not block this one.
        group.MapPutById<RenameAccountGroupRequest, Guid, AccountGroupDto>("{id:guid}")
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription("Rename an account group.");

        // ChangeDescription/ChangeMetadata (GEN, DRK-1277 §11/§12): same reasoning as Rename — each additional
        // [CrudUpdate] member lands on "{id}/{kebab-case-method-name}".
        group.MapPutById<ChangeDescriptionAccountGroupRequest, Guid, AccountGroupDto>("{id:guid}/change-description")
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription("Change an account group's description.");

        group.MapPutById<ChangeMetadataAccountGroupRequest, Guid, AccountGroupDto>("{id:guid}/change-metadata")
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription("Change an account group's metadata.");

        // Partial update (HAND, narrowed, DRK-1277 §11/§12): rename, description and metadata moved off this
        // route onto their own generated routes above; only Activate/Close (GROUP_HOLDS_BALANCE refusal)
        // remains, since that business refusal has nowhere to live in a generated route (R3).
        group.MapPatch("{id:guid}", async (
                Guid id,
                UpdateAccountGroupRequest req,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var result = await bus.Send(req with { Id = id }, cancellationToken: ct);
                return result.ToLedgerResponse();
            })
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription(
                "Change a group's status. {\"status\":\"Closed\"} closes the group.");

        // Delete (GEN, DRK-1421 §3 row 4): the generated MapDeleteById<TEntity,TKey,TRequest> overload — no
        // hand-written route, handler or delete operation (R2). "{id}", NOT "{id:guid}" (R1, the spec gate's
        // deliberate decision): unconstrained, a malformed identifier is a route-binding 400, not a 404 route
        // miss. The refusal itself lives on DeleteAccountGroupRequestValidator (Actions/Delete.cs).
        group.MapDeleteById<AccountGroup, Guid, DeleteAccountGroupRequest>("{id}")
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription("Delete an account group. Refused while the group still holds any account.");

        group.MapGet("{id:guid}/balances", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var balances = await bus.Send(new GetAccountGroupBalancesQuery { Id = id }, cancellationToken: ct);
                return Results.Ok(balances);
            })
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("Read a group's total balances, one line per currency — never combined.");
    }
}

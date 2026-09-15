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

        group.MapGet("/", async (
                [AsParameters] ListAccountGroupsQuery query,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var page = await bus.Send(query, cancellationToken: ct);
                return Results.Ok(page);
            })
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("List account groups, filterable by code, type, status and parent.");

        // Get-by-id (GEN, DRK-1277 §3 row 9): plain generic entity mapper — no SlimBus handler or [CrudCreate]
        // /[CrudUpdate]/[CrudAction] involved, so none of the Map{Entity}Crud caveats above apply. The
        // explicit "{id:guid}" endpoint keeps the same route pattern this used before (the mapper's own
        // default is the looser "{id}").
        group.MapGetById<AccountGroup, Guid, AccountGroupDto>("{id:guid}")
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("Read one account group.");

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
                "Change a group's name, description, status, parent and metadata. " +
                "{\"status\":\"Closed\"} closes the group.");

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

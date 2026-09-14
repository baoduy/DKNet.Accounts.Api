using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.AccountGroups.V1;
using DKNet.Accounts.AppServices.AccountGroups.V1.Actions;
using DKNet.Accounts.AppServices.AccountGroups.V1.Queries;

namespace DKNet.Accounts.Api.ApiEndpoints.AccountGroups;

internal sealed class AccountGroupsV1Endpoint : IEndpointConfig
{
    public int Version => 1;

    public string GroupEndpoint => "/account-groups";

    public void Map(RouteGroupBuilder group)
    {
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

        group.MapGet("{id:guid}", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var dto = await bus.Send(new GetAccountGroupByIdQuery { Id = id }, cancellationToken: ct);
                return dto is null ? Results.NotFound() : Results.Ok(dto);
            })
            .RequireScope(group, ScopeNames.AccountsRead)
            .Produces<AccountGroupDto>()
            .Produces(StatusCodes.Status404NotFound)
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

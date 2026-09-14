using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.AppServices.Accounts.V1;
using DKNet.Accounts.AppServices.Accounts.V1.Actions;
using DKNet.Accounts.AppServices.Accounts.V1.Queries;

namespace DKNet.Accounts.Api.ApiEndpoints.Accounts;

internal sealed class AccountsV1Endpoint : IEndpointConfig
{
    public int Version => 1;

    public string GroupEndpoint => "/accounts";

    public void Map(RouteGroupBuilder group)
    {
        group.MapPost("/", async (
                OpenAccountRequest req,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var result = await bus.Send(req, cancellationToken: ct);
                return result.Response(isCreated: true);
            })
            .RequireAuthorization(ScopeNames.AccountsWrite)
            .Produces<AccountDto>(StatusCodes.Status201Created)
            .WithDescription("Open an account inside a group, in one currency, with an accounting classification.");

        group.MapGet("/", async (
                [AsParameters] ListAccountsQuery query,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var page = await bus.Send(query, cancellationToken: ct);
                return Results.Ok(page);
            })
            .RequireAuthorization(ScopeNames.AccountsRead)
            .WithDescription("List accounts, filterable by group, currency and status.");

        group.MapGet("{id:guid}", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var dto = await bus.Send(new GetAccountByIdQuery { Id = id }, cancellationToken: ct);
                return dto is null ? Results.NotFound() : Results.Ok(dto);
            })
            .RequireAuthorization(ScopeNames.AccountsRead)
            .Produces<AccountDto>()
            .Produces(StatusCodes.Status404NotFound)
            .WithDescription("Read one account.");

        group.MapGet("{id:guid}/balance", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var balance = await bus.Send(new GetAccountBalanceQuery { Id = id }, cancellationToken: ct);
                return balance is null ? Results.NotFound() : Results.Ok(balance);
            })
            .RequireAuthorization(ScopeNames.AccountsRead)
            .Produces<AccountBalanceDto>()
            .Produces(StatusCodes.Status404NotFound)
            .WithDescription("Read an account's balance.");

        group.MapPatch("{id:guid}", async (
                Guid id,
                UpdateAccountRequest req,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var result = await bus.Send(req with { Id = id }, cancellationToken: ct);
                return result.Response();
            })
            .RequireAuthorization(ScopeNames.AccountsWrite)
            .WithDescription(
                "Change an account's name, status, overdraft limit, minimum balance and metadata. " +
                "{\"status\":\"Closed\"} closes the account.");

        group.MapGet("{id:guid}/statement", async (
                Guid id,
                [AsParameters] GetAccountStatementQuery query,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var page = await bus.Send(query with { AccountId = id }, cancellationToken: ct);
                return Results.Ok(page);
            })
            .RequireAuthorization(ScopeNames.PostingsRead)
            .WithDescription("Read an account's postings as a date-bounded, paged statement in stream order.");
    }
}

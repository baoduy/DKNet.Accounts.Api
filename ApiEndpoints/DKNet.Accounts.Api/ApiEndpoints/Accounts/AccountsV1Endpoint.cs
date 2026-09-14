using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.Accounts.V1;
using DKNet.Accounts.AppServices.Accounts.V1.Actions;
using DKNet.Accounts.AppServices.Accounts.V1.Queries;
using DKNet.Accounts.AppServices.Postings.V1;

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
                return result.ToLedgerResponse(isCreated: true);
            })
            .RequireScope(group, ScopeNames.AccountsWrite)
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
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("List accounts, filterable by group, currency and status.");

        group.MapGet("{id:guid}", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var dto = await bus.Send(new GetAccountByIdQuery { Id = id }, cancellationToken: ct);
                return dto is null ? Results.NotFound() : Results.Ok(dto);
            })
            .RequireScope(group, ScopeNames.AccountsRead)
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
            .RequireScope(group, ScopeNames.AccountsRead)
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
                return result.ToLedgerResponse();
            })
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription(
                "Change an account's name, status, overdraft limit, minimum balance and metadata. " +
                "{\"status\":\"Closed\"} closes the account.");

        group.MapGet("{id:guid}/statement", async (
                Guid id,
                DateOnly? from,
                DateOnly? to,
                int? pageIndex,
                int? pageSize,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                // Deliberately NOT [AsParameters] here: combined with this route's own {id} route parameter,
                // minimal API's request-delegate factory rejects every request with an unlogged, bodyless 400
                // (reproduced directly — every other query-string-bound route in this API binds its query
                // object alone, with no sibling route parameter). Explicit parameters sidestep it.
                var query = new GetAccountStatementQuery
                {
                    AccountId = id,
                    From = from,
                    To = to,
                    PageIndex = pageIndex,
                    PageSize = pageSize
                };
                var page = await bus.Send(query, cancellationToken: ct);
                // PagedResponse (not a raw IPagedList) — System.Text.Json serializes IPagedList<T> itself as
                // a bare JSON array (it's also an IEnumerable<T>), silently dropping HasNextPage/PageCount/etc.
                // — the very fields a caller needs to tell "read past the end" from "a genuine empty account".
                return Results.Ok(new PagedResponse<PostingDto>(page));
            })
            .RequireScope(group, ScopeNames.PostingsRead)
            .Produces<PagedResponse<PostingDto>>()
            .WithDescription("Read an account's postings as a date-bounded, paged statement in stream order.");
    }
}

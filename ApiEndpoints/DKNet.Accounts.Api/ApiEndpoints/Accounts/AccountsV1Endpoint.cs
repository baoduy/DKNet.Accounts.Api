using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.Accounts.V1;
using DKNet.Accounts.AppServices.Accounts.V1.Actions;
using DKNet.Accounts.AppServices.Accounts.V1.Queries;
using DKNet.Accounts.AppServices.Crud;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

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

        // List (GEN, DRK-1277 §11/§12): same reasoning as account groups — generated list syntax/envelope.
        group.MapGetList<Account, Guid, AccountDto>()
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("List accounts. Filter as 'field:operation:value', e.g. filter=GroupId:Equal:{id}.");

        // Get-by-id (GEN, DRK-1277 §11/§12): plain generic entity mapper — no SlimBus handler involved.
        group.MapGetById<Account, Guid, AccountDto>("{id:guid}")
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("Read one account.");

        // Rename (GEN, DRK-1277 §11/§12): [CrudUpdate] on Account.Rename — the first such member on the type,
        // so it lands on the plain "{id}" route. Same reasoning as AccountGroup.Rename: 404 is its only
        // failure mode, so R3 doesn't block it, and MapPutById returns its own chainable builder.
        group.MapPutById<RenameAccountRequest, Guid, AccountDto>("{id:guid}")
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription("Rename an account.");

        group.MapPutById<ChangeMetadataAccountRequest, Guid, AccountDto>("{id:guid}/change-metadata")
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription("Change an account's metadata.");

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

        // Partial update (HAND, narrowed, DRK-1277 §11/§12): rename and metadata moved off this route onto
        // their own generated routes above; only Status (AccountHoldsBalance refusal) and overdraft/minimum
        // balance (OverdraftLimitRequired refusal) remain, since neither refusal has anywhere to live in a
        // generated route (R3).
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
                "Change an account's status, overdraft limit and minimum balance. " +
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

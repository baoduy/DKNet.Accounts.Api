using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.AppServices.Accounts.V1;
using DKNet.Accounts.AppServices.Accounts.V1.Actions;
using DKNet.Accounts.AppServices.Accounts.V1.Queries;
using DKNet.Accounts.AppServices.Crud;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.AppServices.Share.Generics;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.Api.ApiEndpoints.Accounts;

// Group-level scope declaration (DRK-1556 §3 rows 2): GET needs accounts.read, POST/PUT/PATCH need
// accounts.write — every route below is one of those four methods except the statement route, which keeps
// its own postings.read override (R1).
[EndpointGroupScope(ScopeNames.AccountsRead, EndpointHttpMethods.Get)]
[EndpointGroupScope(ScopeNames.AccountsWrite, EndpointHttpMethods.Post, EndpointHttpMethods.Put, EndpointHttpMethods.Patch)]
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
                return result.Response(isCreated: !result.IsReplayed());
            })
            .Produces<AccountDto>(StatusCodes.Status201Created)
            .WithDescription("Open an account inside a group, in one currency, with an accounting classification.");

        // GetById/GetList/ChangeDetails now register through one generated composite (DRK-1522 §3
        // row 12), same as account groups. Accounts publish no delete route (R1: never reachable today) — the
        // generated composite's Delete operation stays excluded. Every one of these routes answers a malformed
        // id with 400, not 404 — the generated composite's own default pattern is the looser "{id}" (spec
        // revision 13 §3, frozen: accounts are served by the generated route set for every operation it
        // covers, and publish no delete route; pr-reviewer round 1 finding 7's attempt to restore "{id:guid}"
        // by excluding these routes reversed that frozen requirement and was reverted in round 2).
        group.MapAccountCrud(o => o
                .Exclude(CrudOp.Delete)
                .Configure(CrudOp.GetList, b => b.WithDescription(
                    "List accounts. Filter as 'field:operation:value', e.g. filter=GroupId:Equal:{id}."))
                .Configure(CrudOp.GetById, b => b.WithDescription("Read one account."))
                .Configure(CrudOp.Update, b => b.WithDescription(
                    "Update an account. Send either of name, metadata; a member left out is unchanged.")));

        // Literal segments ("status-counts", "balances") outrank the generated composite's "{id}" read
        // route regardless of registration order — ASP.NET Core route precedence always prefers a literal
        // match over a parameter match (spec revision 13 §3 rows 1/4).
        group.MapGetStatusCounts<Account>("status-counts", new StatusPropertyInfo(nameof(Account.Status), typeof(AccountStatus)));

        group.MapGet("balances", async (
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var balances = await bus.Send(new GetLedgerBalancesQuery(), cancellationToken: ct);
                return Results.Ok(balances);
            })
            .Produces<IReadOnlyCollection<LedgerBalanceLineDto>>()
            .WithDescription("Read the ledger's position by currency — one line per currency, never combined.");

        group.MapGet("{id:guid}/balance", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var balance = await bus.Send(new GetAccountBalanceQuery { Id = id }, cancellationToken: ct);
                return balance is null ? Results.NotFound() : Results.Ok(balance);
            })
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
                return result.Response();
            })
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

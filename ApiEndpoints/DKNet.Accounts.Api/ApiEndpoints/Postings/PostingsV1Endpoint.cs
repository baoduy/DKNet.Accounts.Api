using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.AppServices.Postings.V1.Actions;
using DKNet.Accounts.AppServices.Crud;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.Api.ApiEndpoints.Postings;

internal sealed class PostingsV1Endpoint : IEndpointConfig
{
    public int Version => 1;

    public string GroupEndpoint => "/postings";

    public void Map(RouteGroupBuilder group)
    {
        group.MapPost("/", async (
                RecordPostingRequest req,
                HttpRequest http,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                req = req with { IdempotencyKey = http.Headers["Idempotency-Key"] };
                var result = await bus.Send(req, cancellationToken: ct);
                return result.ToLedgerResponse(isCreated: true);
            })
            .RequireScope(group, ScopeNames.PostingsWrite)
            .Produces<PostingDto>(StatusCodes.Status201Created)
            .WithDescription(
                "Record one credit or debit. Idempotency key is required in the header: " +
                "Idempotency-Key: {IdempotencyKey}.");

        group.MapPost("batch", async (
                RecordPostingBatchRequest req,
                HttpRequest http,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                req = req with { IdempotencyKey = http.Headers["Idempotency-Key"] };
                var result = await bus.Send(req, cancellationToken: ct);
                return result.ToLedgerResponse(isCreated: true);
            })
            .RequireScope(group, ScopeNames.PostingsWrite)
            .Produces<IReadOnlyCollection<PostingDto>>(StatusCodes.Status201Created)
            .WithDescription("Record several movements as one all-or-nothing batch.");

        // Get-by-id (GEN, DRK-1277 §3 row 11): plain generic entity mapper. The explicit "{id:guid}" endpoint
        // keeps the same route pattern this used before (the mapper's own default is the looser "{id}").
        group.MapGetById<Posting, Guid, PostingDto>("{id:guid}")
            .RequireScope(group, ScopeNames.PostingsRead)
            .WithDescription("Read one posting.");

        // Reverse (GEN-REQ, DRK-1277 §3 row 16): ReversePostingRequest is generated from Posting's
        // [CrudAction("reverse")] marker (DKNet.Accounts.AppServices.Crud), but the ROUTE stays hand-mapped —
        // the generated composite's MapActionById hardcodes the package's default FluentResults->IResult
        // conversion (400 on any failure), which cannot express this service's LedgerErrors->422 mapping (R3,
        // LedgerResultResponseExtensions.ToLedgerResponse). Handler stays hand-written for the
        // lock/at-most-once orchestration.
        group.MapPost("{id:guid}/reverse", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var result = await bus.Send(new ReversePostingRequest { Id = id }, cancellationToken: ct);
                return result.ToLedgerResponse();
            })
            .RequireScope(group, ScopeNames.PostingsReverse)
            .Produces<PostingDto>()
            .WithDescription("Reverse a posting.");
    }
}

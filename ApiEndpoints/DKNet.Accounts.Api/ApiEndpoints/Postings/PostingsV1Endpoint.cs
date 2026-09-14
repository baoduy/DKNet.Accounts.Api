using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.AppServices.Postings.V1.Actions;
using DKNet.Accounts.AppServices.Postings.V1.Queries;

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

        group.MapGet("{id:guid}", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var dto = await bus.Send(new GetPostingByIdQuery { Id = id }, cancellationToken: ct);
                return dto is null ? Results.NotFound() : Results.Ok(dto);
            })
            .RequireScope(group, ScopeNames.PostingsRead)
            .Produces<PostingDto>()
            .Produces(StatusCodes.Status404NotFound)
            .WithDescription("Read one posting.");

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

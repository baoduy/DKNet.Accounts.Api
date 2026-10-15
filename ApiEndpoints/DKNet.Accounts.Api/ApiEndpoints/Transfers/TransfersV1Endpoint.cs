using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.AppServices.Transfers.V1;
using DKNet.Accounts.AppServices.Transfers.V1.Actions;
using DKNet.Accounts.AppServices.Transfers.V1.Queries;

namespace DKNet.Accounts.Api.ApiEndpoints.Transfers;

internal sealed class TransfersV1Endpoint : IEndpointConfig
{
    public int Version => 1;

    public string GroupEndpoint => "/transfers";

    public void Map(RouteGroupBuilder group)
    {
        group.MapPost("/", async (
                RecordTransferRequest req,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var result = await bus.Send(req, cancellationToken: ct);
                return result.Response(isCreated: !result.IsReplayed());
            })
            .RequireScope(group, ScopeNames.PostingsWrite)
            .Produces<TransferDto>(StatusCodes.Status201Created)
            .WithDescription(
                "Record one transfer from a source account to a different destination account, converted at the " +
                "caller's rate when the currencies differ, with the caller's fee taken out of the amount. " +
                "Idempotency key is required in the header: Idempotency-Key: {IdempotencyKey}. The key is " +
                "compared without regard to case and returned lowercased.");

        group.MapGet("{id:guid}", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var transfer = await bus.Send(new GetTransferQuery { Id = id }, cancellationToken: ct);
                return transfer is null ? Results.NotFound() : Results.Ok(transfer);
            })
            .RequireScope(group, ScopeNames.PostingsRead)
            .Produces<TransferDto>()
            .Produces(StatusCodes.Status404NotFound)
            .WithDescription("Read one transfer with the postings it recorded. A later reversal is not listed.");
    }
}

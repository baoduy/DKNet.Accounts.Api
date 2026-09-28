using DKNet.EfCore.Abstractions.Events;
using DKNet.Accounts.Infra.Contexts;
using DKNet.Accounts.Share.Options;
using SlimMessageBus;

namespace DKNet.Accounts.Infra.Services;

/// <summary>
///     The event publisher, IMessageBus for both internal and external events. A declared outbound event
///     (DRK-1773 §3a) is wrapped in its <see cref="OutboundEnvelope" /> and published, with a fresh
///     <see cref="OutboundMessageId" />, to the outbound producer — which stores it in the outbox of the save that
///     raised it. With the bus off it is dropped: nothing is stored or sent (R3).
/// </summary>
/// <param name="bus"></param>
/// <param name="outbound">The outbound bus settings; registered only when the bus is on.</param>
/// <param name="db">The saving context of this scope, told when an outbound event could not be stored.</param>
internal sealed class EventPublisher(IMessageBus bus, MessageBusOptions? outbound = null, CoreDbContext? db = null)
    : DefaultEventPublisher
{
    #region Methods

    public override async Task PublishAsync(object eventObj, CancellationToken cancellationToken = default)
    {
        if (!OutboundEnvelope.TryWrap(eventObj, out var envelope))
        {
            await bus.Publish(eventObj, cancellationToken: cancellationToken);
            return;
        }

        if (outbound is null)
        {
            return;
        }

        var headers = new Dictionary<string, object>();
        OutboundMessageId.Stamp(headers);
        try
        {
            await bus.Publish(envelope, headers: headers, cancellationToken: cancellationToken);
        }
        catch (Exception e) when (db is not null)
        {
            db.OutboundEventFailure = e;
            throw;
        }
    }

    #endregion
}

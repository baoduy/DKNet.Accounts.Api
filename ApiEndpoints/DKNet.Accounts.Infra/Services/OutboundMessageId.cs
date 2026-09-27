using Azure.Messaging.ServiceBus;
using RabbitMQ.Client;

namespace DKNet.Accounts.Infra.Services;

/// <summary>
///     The transport message id of an outbound event (DRK-1773 §3a): stamped into the event's headers once, when
///     the event is first published and stored in the outbox, then copied onto the transport message on every send
///     — so every redelivery of the same stored event carries the same id and a consumer can drop duplicates.
/// </summary>
internal static class OutboundMessageId
{
    #region Methods

    /// <summary>Stamps a new message id into the headers an event is published (and stored) with.</summary>
    /// <param name="headers">The headers the event is published with.</param>
    public static void Stamp(IDictionary<string, object> headers) => throw new NotImplementedException();

    /// <summary>Copies the stored message id onto an Azure Service Bus message's <c>MessageId</c>.</summary>
    /// <param name="message">The transport message, its application properties already carrying the headers.</param>
    public static void ApplyTo(ServiceBusMessage message) => throw new NotImplementedException();

    /// <summary>Copies the stored message id onto a RabbitMQ message's <c>message_id</c> property.</summary>
    /// <param name="properties">The transport message properties, their headers already carrying the headers.</param>
    public static void ApplyTo(IBasicProperties properties) => throw new NotImplementedException();

    #endregion
}

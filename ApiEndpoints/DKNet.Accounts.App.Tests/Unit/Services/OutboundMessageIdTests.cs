using System.Text;
using System.Text.Json;
using Azure.Messaging.ServiceBus;
using DKNet.Accounts.Infra.Services;
using RabbitMQ.Client;

namespace DKNet.Accounts.App.Tests.Unit.Services;

/// <summary>
/// DRK-1773 §5 @unit "A redelivered event keeps its message id". An outbox redelivery re-sends the stored row:
/// the same headers, read back from the outbox table, handed to the transport again. Each "send" below is what the
/// transport provider does with those stored headers before the message leaves — Azure Service Bus copies them
/// into <c>ApplicationProperties</c>, RabbitMQ into <c>Headers</c> as UTF-8 bytes — followed by the message-id
/// step under test.
/// </summary>
public sealed class OutboundMessageIdTests
{
    #region Methods

    [Fact]
    public void ARedeliveredEventKeepsItsMessageId_OnAzureServiceBus()
    {
        // Given a currency-created event for "SGD" was sent once
        var storedHeaders = PublishAndStore();
        var firstCopy = SendOnAzureServiceBus(storedHeaders);

        // When the same event is sent again
        var secondCopy = SendOnAzureServiceBus(ReloadFromOutbox(storedHeaders));

        // Then both copies carry the same message id
        firstCopy.MessageId.ShouldNotBeNullOrWhiteSpace();
        firstCopy.MessageId.Length.ShouldBeLessThanOrEqualTo(128);
        secondCopy.MessageId.ShouldBe(firstCopy.MessageId);
    }

    [Fact]
    public void ARedeliveredEventKeepsItsMessageId_OnRabbitMq()
    {
        // Given a currency-created event for "SGD" was sent once
        var storedHeaders = PublishAndStore();
        var firstCopy = SendOnRabbitMq(storedHeaders);

        // When the same event is sent again
        var secondCopy = SendOnRabbitMq(ReloadFromOutbox(storedHeaders));

        // Then both copies carry the same message id
        firstCopy.MessageId.ShouldNotBeNullOrWhiteSpace();
        firstCopy.MessageId!.Length.ShouldBeLessThanOrEqualTo(128);
        secondCopy.MessageId.ShouldBe(firstCopy.MessageId);
    }

    [Fact]
    public void TwoDifferentEvents_CarryDifferentMessageIds()
    {
        // The presence sibling of the scenario above: a constant id would also be "the same on every resend".
        var first = SendOnAzureServiceBus(PublishAndStore());
        var second = SendOnAzureServiceBus(PublishAndStore());

        second.MessageId.ShouldNotBe(first.MessageId);
    }

    /// <summary>First publish: the event's headers are stamped, then stored in the outbox with the event.</summary>
    private static IDictionary<string, object> PublishAndStore()
    {
        var headers = new Dictionary<string, object>();
        OutboundMessageId.Stamp(headers);
        return ReloadFromOutbox(headers);
    }

    /// <summary>The outbox stores headers as JSON and reads string values back as strings.</summary>
    private static IDictionary<string, object> ReloadFromOutbox(IDictionary<string, object> headers)
    {
        var json = JsonSerializer.Serialize(headers);
        return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json)!
            .ToDictionary(h => h.Key, h => (object)h.Value.GetString()!);
    }

    private static ServiceBusMessage SendOnAzureServiceBus(IDictionary<string, object> storedHeaders)
    {
        var message = new ServiceBusMessage();
        foreach (var header in storedHeaders)
        {
            message.ApplicationProperties.Add(header.Key, header.Value);
        }

        OutboundMessageId.ApplyTo(message);
        return message;
    }

    private static BasicProperties SendOnRabbitMq(IDictionary<string, object> storedHeaders)
    {
        var properties = new BasicProperties
        {
            Headers = storedHeaders.ToDictionary(
                h => h.Key,
                h => (object?)(h.Value is string s ? Encoding.UTF8.GetBytes(s) : h.Value))
        };

        OutboundMessageId.ApplyTo(properties);
        return properties;
    }

    #endregion
}

using Azure.Messaging.ServiceBus;
using DKNet.Accounts.Infra.Services;
using RabbitMQ.Client;

namespace DKNet.Accounts.App.Tests.Unit.Services;

/// <summary>A transport message that carries no stored message id keeps the transport's own (DRK-1773 §3a).</summary>
public sealed class OutboundMessageIdHeaderTests
{
    #region Methods

    [Fact]
    public void AnAzureServiceBusMessageWithoutTheHeader_KeepsItsOwnMessageId()
    {
        var message = new ServiceBusMessage { MessageId = "transport-id" };
        message.ApplicationProperties.Add("Other", "value");

        OutboundMessageId.ApplyTo(message);

        message.MessageId.ShouldBe("transport-id");
    }

    [Fact]
    public void ARabbitMqMessage_CarriesTheStoredIdAsItsText()
    {
        var properties = new BasicProperties
        {
            Headers = new Dictionary<string, object?> { [OutboundMessageId.Header] = "0f1e2d3c"u8.ToArray() }
        };

        OutboundMessageId.ApplyTo(properties);

        properties.MessageId.ShouldBe("0f1e2d3c");
    }

    [Fact]
    public void ARabbitMqMessageWithoutHeaders_KeepsNoMessageId()
    {
        var properties = new BasicProperties();

        OutboundMessageId.ApplyTo(properties);

        properties.MessageId.ShouldBeNull();
    }

    [Fact]
    public void ARabbitMqMessageWhoseHeaderIsNotText_KeepsNoMessageId()
    {
        var properties = new BasicProperties { Headers = new Dictionary<string, object?> { [OutboundMessageId.Header] = 42 } };

        OutboundMessageId.ApplyTo(properties);

        properties.MessageId.ShouldBeNull();
    }

    #endregion
}

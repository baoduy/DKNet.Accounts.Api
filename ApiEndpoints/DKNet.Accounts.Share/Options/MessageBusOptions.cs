namespace DKNet.Accounts.Share.Options;

/// <summary>
///     The transport the outbound events (DRK-1773) are sent on.
/// </summary>
public enum MessageBusTransport
{
    /// <summary>Azure Service Bus — production. The queue is provisioned outside the service.</summary>
    AzureServiceBus,

    /// <summary>RabbitMQ — local runs and integration tests. The service declares the queue when it is missing.</summary>
    RabbitMq
}

/// <summary>
///     The outbound message bus settings (section <c>MessageBus</c>). The bus is on only when
///     <see cref="FeatureOptions.EnableServiceBus" /> is set and the chosen transport's connection string
///     (<c>ConnectionStrings:AzureBus</c> or <c>ConnectionStrings:RabbitMq</c>) is non-empty.
/// </summary>
public sealed class MessageBusOptions
{
    #region Properties

    /// <summary>
    ///     Gets or sets the transport the outbound events are sent on. Default is Azure Service Bus.
    /// </summary>
    public MessageBusTransport Transport { get; set; } = MessageBusTransport.AzureServiceBus;

    /// <summary>
    ///     Gets or sets the queue every outbound event is sent to. Default is <c>ledger-events</c>.
    /// </summary>
    public string OutboundQueue { get; set; } = "ledger-events";

    /// <summary>
    ///     Gets the configuration section name for the message bus.
    /// </summary>
    public static string Name => "MessageBus";

    #endregion
}

using DKNet.Accounts.AppServices;
using DKNet.Accounts.Infra.Extensions;
using DKNet.Accounts.Infra.Services;
using DKNet.Notification.Client;
using DKNet.Accounts.Share.Options;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RabbitMQ.Client;
using SlimMessageBus.Host;
using SlimMessageBus.Host.AzureServiceBus;
using SlimMessageBus.Host.Hybrid;
using SlimMessageBus.Host.RabbitMQ;
using DKNet.Accounts.Infra.Postgres;

namespace DKNet.Accounts.App.Tests.Unit.Extensions;

/// <summary>
/// DRK-1773 §5 @unit "Configuration picks the transport and queue". "The service starts" is
/// <see cref="ServiceBusSetup.AddServiceBus"/> building the bus the host would start. Both transports' connection
/// strings are configured in every row, so the transport is proven to come from <c>MessageBus:Transport</c>
/// alone — never from which connection happens to be present.
/// </summary>
public sealed class OutboundTransportConfigurationTests
{
    private const string OutboundQueue = "ledger-events";
    private const string OnboardingQueue = "ledger-events.onboarding-email";
    private const string AzureBusChild = "AzureBus";
    private const string RabbitMqChild = "RabbitMq";

    private const string AzureBusConnection =
        "Endpoint=sb://fake.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v";

    private const string RabbitMqConnection = "amqp://guest:guest@localhost:5672/";

    #region Methods

    [Fact]
    public async Task ConfigurationPicksTheTransportAndQueue_AzureServiceBus_NeverCreatesTheQueue()
    {
        // Given the service is configured for Azure Service Bus with outbound queue "ledger-events"
        // When the service starts
        await using var provider = StartService("AzureServiceBus");
        var bus = (HybridMessageBus)provider.GetRequiredService<IMasterMessageBus>();

        // Then events go to queue "ledger-events" on Azure Service Bus
        var childNames = bus.Settings.Children.Select(c => c.Name).ToArray();
        childNames.ShouldContain(AzureBusChild);
        childNames.ShouldNotContain(RabbitMqChild);

        var azureBus = (ServiceBusMessageBus)bus.GetChildBus(AzureBusChild);
        var producer = azureBus.Settings.Producers.ShouldHaveSingleItem();
        producer.DefaultPath.ShouldBe(OutboundQueue);
        producer.PathKind.ShouldBe(PathKind.Queue);

        // And the service never creates the queue
        azureBus.ProviderSettings.TopologyProvisioning.Enabled.ShouldBeFalse();
    }

    [Fact]
    public async Task ConfigurationPicksTheTransportAndQueue_RabbitMq_CreatesTheQueueWhenItIsMissing()
    {
        // Given the service is configured for RabbitMQ with outbound queue "ledger-events"
        // When the service starts
        await using var provider = StartService("RabbitMq");
        var bus = (HybridMessageBus)provider.GetRequiredService<IMasterMessageBus>();

        var childNames = bus.Settings.Children.Select(c => c.Name).ToArray();
        childNames.ShouldContain(RabbitMqChild);
        childNames.ShouldNotContain(AzureBusChild);

        var rabbitBus = (RabbitMqMessageBus)bus.GetChildBus(RabbitMqChild);
        var producer = rabbitBus.Settings.Producers.ShouldHaveSingleItem();

        // The broker holds no queue yet: provision the topology against it the way the RabbitMQ provider does
        // once it connects — the configured topology initializer when there is one, the default one otherwise.
        var broker = EmptyBroker();
        await ProvisionTopologyAsync(rabbitBus, broker.Object);

        // Then events go to queue "ledger-events" on RabbitMQ
        var bindings = Calls(broker, nameof(IChannel.QueueBindAsync))
            .Select(c => (Queue: (string)c["queue"]!, Exchange: (string)c["exchange"]!))
            .ToArray();
        bindings.ShouldContain((OutboundQueue, producer.DefaultPath),
            $"the queue must be bound to the exchange the outbound producer publishes to ({producer.DefaultPath}).");

        // And the service creates the queue when it is missing
        var declarations = Calls(broker, nameof(IChannel.QueueDeclareAsync))
            .Where(c => (string)c["queue"]! == OutboundQueue)
            .ToArray();
        declarations.ShouldNotBeEmpty($"the service must declare queue {OutboundQueue} on the broker.");
        declarations.ShouldContain(c => (bool)c["passive"]! == false,
            "a passive declare only checks for the queue; creating a missing queue needs a non-passive one.");
    }

    /// <summary>
    /// DRK-2156 R5 and §5: with the email feature on and the RabbitMQ transport, the service consumes its own copy
    /// of the events from <c>ledger-events.onboarding-email</c>, a durable queue bound to the outbound exchange,
    /// and the outbound queue keeps its own binding.
    /// </summary>
    [Fact]
    public async Task OnboardingEmail_OnWithRabbitMq_ReadsItsOwnCopyOfTheEvents()
    {
        var services = Register("RabbitMq", onboardingEmail: true);
        services.Count(d => d.ServiceType == typeof(OnboardingEmailConsumer)).ShouldBe(1);

        await using var provider = services.BuildServiceProvider();
        var bus = (HybridMessageBus)provider.GetRequiredService<IMasterMessageBus>();
        var rabbitBus = (RabbitMqMessageBus)bus.GetChildBus(RabbitMqChild);

        var consumer = rabbitBus.Settings.Consumers.ShouldHaveSingleItem();
        // A RabbitMQ consumer's path is the exchange it binds to; its queue shows in the topology below.
        consumer.Path.ShouldBe(OutboundQueue);
        consumer.ConsumerType.ShouldBe(typeof(OnboardingEmailConsumer));
        consumer.MessageType.ShouldBe(typeof(OutboundEnvelope));
        provider.GetService<INotificationClient>().ShouldNotBeNull();
        // The token handler resolves with what AddServiceBus registers, its clock included.
        provider.GetRequiredService<NotificationTokenHandler>().ShouldNotBeNull();

        var broker = EmptyBroker();
        await ProvisionTopologyAsync(rabbitBus, broker.Object);

        var producer = rabbitBus.Settings.Producers.ShouldHaveSingleItem();
        var bindings = Calls(broker, nameof(IChannel.QueueBindAsync))
            .Select(c => (Queue: (string)c["queue"]!, Exchange: (string)c["exchange"]!))
            .ToArray();
        bindings.ShouldContain((OnboardingQueue, producer.DefaultPath));
        bindings.ShouldContain((OutboundQueue, producer.DefaultPath));

        var declaration = Calls(broker, nameof(IChannel.QueueDeclareAsync))
            .Where(c => (string)c["queue"]! == OnboardingQueue)
            .ShouldHaveSingleItem();
        declaration["durable"].ShouldBe(true);
        declaration["passive"].ShouldBe(false);
        declaration["autoDelete"].ShouldBe(false);
    }

    /// <summary>DRK-2156 §6a D8: anything short of flag on + bus on + RabbitMQ leaves the service as it was.</summary>
    [Theory]
    [InlineData(false, "RabbitMq", true)]
    [InlineData(true, "AzureServiceBus", true)]
    [InlineData(true, "RabbitMq", false)]
    public async Task OnboardingEmail_WithoutFlagBusAndRabbitMq_AddsNoQueueConsumerOrClient(
        bool onboardingEmail, string transport, bool busOn)
    {
        var services = Register(transport, onboardingEmail, busOn);

        // DRK-2160 finding 1: not even registered, or the host's DI validation fails on its missing client.
        services.ShouldNotContain(d => d.ServiceType == typeof(OnboardingEmailConsumer));

        await using var provider = services.BuildServiceProvider();
        var bus = (HybridMessageBus)provider.GetRequiredService<IMasterMessageBus>();

        bus.Settings.Children.SelectMany(c => c.Consumers)
            .ShouldNotContain(c => c.ConsumerType == typeof(OnboardingEmailConsumer));
        provider.GetService<INotificationClient>().ShouldBeNull();

        if (bus.Settings.Children.Any(c => c.Name == RabbitMqChild))
        {
            var broker = EmptyBroker();
            await ProvisionTopologyAsync((RabbitMqMessageBus)bus.GetChildBus(RabbitMqChild), broker.Object);
            Calls(broker, nameof(IChannel.QueueDeclareAsync))
                .Select(c => (string)c["queue"]!)
                .ShouldBe([OutboundQueue]);
        }
    }

    [Theory]
    [InlineData("")]
    [InlineData("notification-without-scheme")]
    public void OnboardingEmail_OnWithNoAbsoluteNotificationAddress_FailsAtStart(string notificationBaseUrl)
    {
        var thrown = Should.Throw<InvalidOperationException>(
            () => StartService("RabbitMq", onboardingEmail: true, notificationBaseUrl: notificationBaseUrl));

        thrown.Message.ShouldBe("OnboardingEmail:NotificationBaseUrl is not set.");
    }

    private static ServiceProvider StartService(string transport, bool onboardingEmail = false, bool busOn = true,
        string notificationBaseUrl = "http://notification.test") =>
        Register(transport, onboardingEmail, busOn, notificationBaseUrl).BuildServiceProvider();

    /// <summary>The service collection <see cref="StartService"/> builds its provider from.</summary>
    private static ServiceCollection Register(string transport, bool onboardingEmail = false, bool busOn = true,
        string notificationBaseUrl = "http://notification.test")
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MessageBus:Transport"] = transport,
                ["MessageBus:OutboundQueue"] = OutboundQueue,
                ["ConnectionStrings:AzureBus"] = AzureBusConnection,
                ["ConnectionStrings:RabbitMq"] = RabbitMqConnection,
                ["OnboardingEmail:NotificationBaseUrl"] = notificationBaseUrl
            })
            .Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddServiceBus(configuration, typeof(AppSetup).Assembly,
            new FeatureOptions { EnableServiceBus = busOn, EnableOnboardingEmail = onboardingEmail },
            PostgresSetup.AddPostgresOutbox);

        return services;
    }

    /// <summary>A broker channel that records every call and answers each declare as if the entity was created.</summary>
    private static Mock<IChannel> EmptyBroker()
    {
        var channel = new Mock<IChannel>();
        channel
            .Setup(c => c.QueueDeclareAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<bool>(),
                It.IsAny<IDictionary<string, object?>?>(), It.IsAny<bool>(), It.IsAny<bool>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((string queue, bool _, bool _, bool _, IDictionary<string, object?>? _, bool _, bool _,
                CancellationToken _) => new QueueDeclareOk(queue, 0, 0));
        return channel;
    }

    private static async Task ProvisionTopologyAsync(RabbitMqMessageBus bus, IChannel channel)
    {
        var defaultTopology = new RabbitMqTopologyService(
            NullLoggerFactory.Instance, channel, bus.Settings, bus.ProviderSettings);

        if (bus.ProviderSettings.Properties.TryGetValue("RabbitMQ_TopologyInitializer", out var value)
            && value is RabbitMqTopologyInitializer initializer)
        {
            await initializer(channel, () => defaultTopology.ProvisionTopology());
        }
        else
        {
            await defaultTopology.ProvisionTopology();
        }
    }

    /// <summary>Every recorded call to <paramref name="method"/>, its arguments keyed by parameter name.</summary>
    private static IEnumerable<IReadOnlyDictionary<string, object?>> Calls(Mock<IChannel> channel, string method) =>
        channel.Invocations
            .Where(i => i.Method.Name == method)
            .Select(i => (IReadOnlyDictionary<string, object?>)i.Method.GetParameters()
                .Zip(i.Arguments, (p, a) => (p.Name!, a))
                .ToDictionary(x => x.Item1, x => x.a));

    #endregion
}

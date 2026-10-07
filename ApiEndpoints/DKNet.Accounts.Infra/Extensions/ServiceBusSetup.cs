using System.Diagnostics.CodeAnalysis;
using Azure.Messaging.ServiceBus;
using DKNet.Accounts.Infra.Contexts;
using DKNet.Accounts.Infra.Services;
using DKNet.Accounts.Share.Options;
using DKNet.Notification.Client;
using SlimMessageBus.Host.Outbox;
using SlimMessageBus.Host.RabbitMQ;

namespace DKNet.Accounts.Infra.Extensions;

[ExcludeFromCodeCoverage]
public static class ServiceBusSetup
{
    #region Methods

    /// <summary>
    ///     The outbound transport when it is Azure Service Bus (production): the outbound queue is provisioned
    ///     outside the service, so topology provisioning stays off and the queue is never created here.
    /// </summary>
    private static MessageBusBuilder AddAzureBus(this MessageBusBuilder builder, string connectionString,
        string outboundQueue)
    {
        builder.AddChildBus(
            "AzureBus",
            azb =>
            {
                azb.AddServicesFromAssembly(typeof(InfraSetup).Assembly)
                    .WithProviderServiceBus(st =>
                    {
                        st.ConnectionString = connectionString;
                        st.ClientFactory = (_, settings) =>
                            new ServiceBusClient(
                                settings.ConnectionString,
                                new ServiceBusClientOptions
                                {
                                    // Use WebSockets transport for Azure Service Bus
                                    TransportType = ServiceBusTransportType.AmqpWebSockets
                                });

                        st.TopologyProvisioning = new ServiceBusTopologySettings
                        {
                            Enabled = false,
                            CanProducerCreateTopic = true,
                            CanProducerCreateQueue = true,
                            CanConsumerCreateSubscription = true,
                            CanConsumerCreateQueue = true,
                            CreateSubscriptionOptions = op =>
                            {
                                op.EnableBatchedOperations = true;
                                op.MaxDeliveryCount = 10;
                                op.AutoDeleteOnIdle = TimeSpan.FromDays(60);
                                op.DeadLetteringOnMessageExpiration = true;
                                op.DefaultMessageTimeToLive = TimeSpan.FromDays(7);
                            }
                        };
                    })
                    .Produce<OutboundEnvelope>(x => x
                        .DefaultQueue(outboundQueue)
                        .WithModifier((_, message) => OutboundMessageId.ApplyTo(message))
                        .UseOutbox());
            });
        return builder;
    }

    /// <summary>
    ///     The outbound transport when it is RabbitMQ (local runs and integration tests): events are published to a
    ///     fanout exchange named after the outbound queue, and the queue is declared (created when missing) and bound
    ///     to it whenever the bus connects, so a local setup needs no manual step. With an onboarding queue
    ///     (DRK-2156 R5), that durable queue is bound to the same exchange and read by
    ///     <see cref="OnboardingEmailConsumer" />: the email feature gets its own copy of every event.
    /// </summary>
    private static MessageBusBuilder AddRabbitMqBus(this MessageBusBuilder builder, string connectionString,
        string outboundQueue, string? onboardingQueue)
    {
        builder.AddChildBus(
            "RabbitMq",
            rmq =>
            {
                rmq
                    .WithProviderRabbitMQ(st =>
                    {
                        st.ConnectionString = connectionString;
                        st.UseTopologyInitializer(async (channel, applyDefaultTopology) =>
                        {
                            await channel.QueueDeclareAsync(outboundQueue, durable: true, exclusive: false,
                                autoDelete: false);
                            await applyDefaultTopology();
                            await channel.QueueBindAsync(outboundQueue, outboundQueue, routingKey: string.Empty);
                        });
                    })
                    .Produce<OutboundEnvelope>(x => x
                        .Exchange(outboundQueue, ExchangeType.Fanout, durable: true)
                        .MessagePropertiesModifier((_, properties) =>
                        {
                            properties.Persistent = true;
                            OutboundMessageId.ApplyTo(properties);
                        })
                        .UseOutbox());

                if (onboardingQueue is not null)
                {
                    rmq.Consume<OutboundEnvelope>(x => x
                        .Queue(onboardingQueue, durable: true, autoDelete: false)
                        .ExchangeBinding(outboundQueue)
                        .WithConsumer<OnboardingEmailConsumer>());
                }
            });
        return builder;
    }

    /// <summary>
    ///     The onboarding email (DRK-2156 R5), registered only with the feature on and the bus on over RabbitMQ:
    ///     its settings, its token handler, the DKNet Notification client (no retry or resilience handler, R6) and
    ///     the consumer. Returns the queue the consumer reads.
    /// </summary>
    private static string AddOnboardingEmail(this IServiceCollection service, IConfiguration configuration)
    {
        var section = configuration.GetSection(OnboardingEmailOptions.Name);
        var settings = section.Get<OnboardingEmailOptions>() ?? new OnboardingEmailOptions();
        if (settings.NotificationBaseUrl is not { IsAbsoluteUri: true })
        {
            throw new InvalidOperationException(
                $"{OnboardingEmailOptions.Name}:{nameof(OnboardingEmailOptions.NotificationBaseUrl)} is not set.");
        }

        service.Configure<OnboardingEmailOptions>(section)
            .AddTransient<NotificationTokenHandler>()
            .AddTransient<OnboardingEmailConsumer>()
            .AddNotificationClient(settings.NotificationBaseUrl, typeof(NotificationTokenHandler));
        return settings.Queue;
    }

    internal static MessageBusBuilder AddMemoryBus(this MessageBusBuilder builder, Assembly serviceAssembly)
    {
        //Memory bus to handle the internal MediatR-Like processes
        builder.AddChildBus(
            "ImMemory",
            me =>

                //https://github.com/zarusz/SlimMessageBus/blob/master/docs/provider_memory.md
                me.WithProviderMemory(cf =>
                    {
                        cf.EnableMessageHeaders = false;
                        cf.EnableMessageSerialization = false;
                        cf.EnableBlockingPublish = false;
                    })
                    .AutoDeclareFrom(serviceAssembly)
                    .AddServicesFromAssembly(serviceAssembly));

        return builder;
    }

    /// <summary>
    ///     A stored event is kept until the bus accepts it (R2): never give up on it, and retry a failed send soon
    ///     after the bus is back. Applied to whichever database's outbox <see cref="AddServiceBus"/> is given.
    /// </summary>
    private static void ConfigureOutbox(OutboxSettings outbox)
    {
        outbox.MaxDeliveryAttempts = int.MaxValue;
        outbox.PollIdleSleep = TimeSpan.FromSeconds(10);
    }

    /// <summary>
    ///     Registers the message bus: the in-memory bus always, plus the outbound transport and the outbox when the
    ///     bus is on.
    /// </summary>
    /// <param name="service">The service collection used to register dependencies.</param>
    /// <param name="configuration">The configuration holding <see cref="MessageBusOptions"/> and the bus connection strings.</param>
    /// <param name="serviceAssembly">The assembly whose handlers the in-memory bus dispatches to.</param>
    /// <param name="features">
    ///     The feature switches; <see cref="FeatureOptions.EnableServiceBus"/> turns the outbound bus on, and
    ///     <see cref="FeatureOptions.EnableOnboardingEmail"/> the onboarding email on top of a RabbitMQ bus.
    /// </param>
    /// <param name="addOutbox">
    ///     The chosen database's outbox registration, given the shared outbox settings to apply.
    /// </param>
    /// <returns>The same <see cref="IServiceCollection"/> instance for chaining.</returns>
    public static IServiceCollection AddServiceBus(
        this IServiceCollection service,
        IConfiguration configuration,
        Assembly serviceAssembly,
        FeatureOptions features,
        Action<MessageBusBuilder, Action<OutboxSettings>> addOutbox)
    {
        var options = configuration.GetSection(MessageBusOptions.Name).Get<MessageBusOptions>()
                      ?? new MessageBusOptions();
        var isRabbitMq = options.Transport == MessageBusTransport.RabbitMq;
        var busConnectionString = configuration.GetConnectionString(
            isRabbitMq ? SharedConsts.RabbitMqConnectionString : SharedConsts.AzureBusConnectionString);
        var isBusOn = features.EnableServiceBus && !string.IsNullOrWhiteSpace(busConnectionString);
        var onboardingQueue = features.EnableOnboardingEmail && isBusOn && isRabbitMq
            ? service.AddOnboardingEmail(configuration)
            : null;

        // Its presence is what tells EventPublisher and CoreDbContext the outbound bus is on (R3).
        if (isBusOn)
        {
            service.AddSingleton(options);
        }

        service.AddSlimBusEfCoreInterceptor<CoreDbContext>()
            .AddSlimMessageBus(mbb =>
        {
            //This is a global config for all the child buses
            mbb.AddJsonSerializer();

            mbb.AddMemoryBus(serviceAssembly);

            if (!isBusOn)
            {
                return;
            }

            if (isRabbitMq)
            {
                mbb.AddRabbitMqBus(busConnectionString!, options.OutboundQueue, onboardingQueue);
            }
            else
            {
                mbb.AddAzureBus(busConnectionString!, options.OutboundQueue);
            }

            addOutbox(mbb, ConfigureOutbox);
        });

        return service;
    }

    #endregion
}
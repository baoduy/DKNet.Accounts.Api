using DKNet.Accounts.Client;
using DKNet.Accounts.EmailProcessor;
using DKNet.Notification.Client;
using SlimMessageBus.Host;
using SlimMessageBus.Host.RabbitMQ;
using SlimMessageBus.Host.Serialization.SystemTextJson;

var builder = Host.CreateApplicationBuilder(args);

// Every setting is set by the AppHost. A missing one stops the processor at start, naming the key, never its value.
var config = builder.Configuration;
string Setting(string key) => string.IsNullOrWhiteSpace(config[key])
    ? throw new InvalidOperationException($"{key} is not set — run the email processor from the AppHost.")
    : config[key]!;
var apiBaseUrl = new Uri(Setting("ApiBaseUrl"));
var notificationBaseUrl = new Uri(Setting("NotificationBaseUrl"));
_ = Setting("Auth:TokenUrl");
_ = Setting("Auth:ClientId");
_ = Setting("Auth:ClientSecret");
var rabbitMq = Setting("ConnectionStrings:RabbitMq");
var exchange = Setting("MessageBus:Exchange");
var queue = Setting("MessageBus:Queue");

// Both clients sign in as the processor's own machine client. No retry or resilience handler on either (R4).
builder.Services.AddTransient<ClientCredentialsHandler>()
    .AddAccountClient(apiBaseUrl, typeof(ClientCredentialsHandler))
    .AddNotificationClient(notificationBaseUrl, typeof(ClientCredentialsHandler));

// The processor's own durable queue, bound to the API's fanout exchange: it gets its own copy of every ledger event.
builder.Services.AddTransient<OnboardingEmailConsumer>()
    .AddSingleton<IAssemblyQualifiedNameMessageTypeResolverRedirect, LedgerEventTypeRedirect>()
    .AddSlimMessageBus(mbb => mbb
    .AddJsonSerializer()
    .WithProviderRabbitMQ(st =>
    {
        st.ConnectionString = rabbitMq;
        // Declared the way the API declares it, so either may start first.
        st.UseTopologyInitializer(async (channel, applyDefaultTopology) =>
        {
            await channel.ExchangeDeclareAsync(exchange, ExchangeType.Fanout, durable: true, autoDelete: false);
            await applyDefaultTopology();
        });
    })
    .Consume<LedgerEvent>(x => x
        .Queue(queue, durable: true, autoDelete: false)
        .ExchangeBinding(exchange)
        .WithConsumer<OnboardingEmailConsumer>()));

await builder.Build().RunAsync();

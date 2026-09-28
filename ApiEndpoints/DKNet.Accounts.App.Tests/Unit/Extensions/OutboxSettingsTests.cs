using DKNet.Accounts.AppServices;
using DKNet.Accounts.Infra.Extensions;
using DKNet.Accounts.Share.Options;
using Microsoft.Extensions.Configuration;
using SlimMessageBus.Host.Outbox;

namespace DKNet.Accounts.App.Tests.Unit.Extensions;

/// <summary>DRK-1773 R2: a stored event is kept until the bus accepts it, however long the bus is away.</summary>
public sealed class OutboxSettingsTests
{
    [Fact]
    public async Task TheOutbox_NeverGivesUpOnAStoredEvent_AndRetriesSoonAfterTheBusIsBack()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MessageBus:Transport"] = "RabbitMq",
                ["ConnectionStrings:RabbitMq"] = "amqp://guest:guest@localhost:5672/"
            })
            .Build();
        var services = new ServiceCollection().AddLogging();
        services.AddServiceBus(configuration, typeof(AppSetup).Assembly, new FeatureOptions { EnableServiceBus = true });
        await using var provider = services.BuildServiceProvider();

        var settings = provider.GetRequiredService<OutboxSettings>();

        settings.MaxDeliveryAttempts.ShouldBe(int.MaxValue);
        settings.PollIdleSleep.ShouldBe(TimeSpan.FromSeconds(10));
    }
}

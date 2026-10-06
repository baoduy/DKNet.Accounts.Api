using DKNet.Accounts.Api.Configs;
using DKNet.Accounts.AppServices;
using DKNet.Accounts.Infra.Extensions;
using DKNet.Accounts.Share;
using DKNet.Accounts.Share.Options;
using Microsoft.Extensions.Configuration;
using SlimMessageBus.Host.Outbox;
using SlimMessageBus.Host.Outbox.PostgreSql.Configuration;
using SlimMessageBus.Host.Outbox.Sql;

namespace DKNet.Accounts.App.Tests.Unit.Extensions;

/// <summary>DRK-1773 R2: a stored event is kept until the bus accepts it, however long the bus is away.</summary>
public sealed class OutboxSettingsTests
{
    /// <summary>DRK-2120 R1: the chosen database's outbox is the one registered, with the same settings on each.</summary>
    [Theory]
    [InlineData(DatabaseProvider.Postgres, typeof(PostgreSqlOutboxSettings))]
    [InlineData(DatabaseProvider.SqlServer, typeof(SqlOutboxSettings))]
    public async Task TheOutbox_NeverGivesUpOnAStoredEvent_AndRetriesSoonAfterTheBusIsBack(
        DatabaseProvider database, Type expectedOutbox)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MessageBus:Transport"] = "RabbitMq",
                ["ConnectionStrings:RabbitMq"] = "amqp://guest:guest@localhost:5672/"
            })
            .Build();
        var services = new ServiceCollection().AddLogging();
        services.AddServiceBus(configuration, typeof(AppSetup).Assembly, new FeatureOptions { EnableServiceBus = true },
            DatabaseConfig.AddOutbox(database));
        await using var provider = services.BuildServiceProvider();

        var settings = provider.GetRequiredService<OutboxSettings>();

        settings.ShouldBeOfType(expectedOutbox);
        settings.MaxDeliveryAttempts.ShouldBe(int.MaxValue);
        settings.PollIdleSleep.ShouldBe(TimeSpan.FromSeconds(10));
    }
}

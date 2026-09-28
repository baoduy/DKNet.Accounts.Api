using DKNet.Accounts.Domains.Features.Currencies.Entities;
using DKNet.Accounts.Infra.Contexts;
using DKNet.Accounts.Infra.Services;
using DKNet.Accounts.Share.Options;
using Microsoft.EntityFrameworkCore;
using Moq;
using SlimMessageBus;

namespace DKNet.Accounts.App.Tests.Unit.Services;

/// <summary>DRK-1773 §3 row 7 and R3: how <see cref="EventPublisher"/> hands each event to the bus.</summary>
public sealed class EventPublisherTests
{
    private static readonly CurrencyCreatedEvent CurrencyCreated = new()
    {
        Id = Guid.NewGuid(), Code = "SGD", Name = "Singapore dollar", DecimalPlaces = 2, IsActive = true,
        CreatedBy = "PayHub", CreatedOn = DateTimeOffset.UtcNow
    };

    private readonly Mock<IMessageBus> _bus = new();

    #region Methods

    [Fact]
    public async Task AnEventThatIsNotOutbound_IsPublishedAsItIs()
    {
        var internalEvent = new { Name = "internal" };

        await new EventPublisher(_bus.Object, new MessageBusOptions()).PublishAsync(internalEvent);

        _bus.Verify(b => b.Publish<object>(internalEvent, null, null, It.IsAny<CancellationToken>()), Times.Once);
        _bus.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task WithTheBusOff_AnOutboundEventIsNeitherStoredNorSent()
    {
        await new EventPublisher(_bus.Object).PublishAsync(CurrencyCreated);

        _bus.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task WithTheBusOn_AnOutboundEventIsPublishedInItsEnvelope_WithAMessageId()
    {
        await new EventPublisher(_bus.Object, new MessageBusOptions()).PublishAsync(CurrencyCreated);

        _bus.Verify(b => b.Publish(
            It.Is<OutboundEnvelope>(e => e.Type == "currencies.created"
                                         && e.Payload.GetProperty("id").GetGuid() == CurrencyCreated.Id),
            null,
            It.Is<IDictionary<string, object>>(h => h.Count == 1 && ((string)h[OutboundMessageId.Header]).Length == 32),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AnOutboundEventThatCannotBeStored_IsReportedToTheSavingContext_AndRethrown()
    {
        var failure = new InvalidOperationException("outbox down");
        _bus.Setup(b => b.Publish(It.IsAny<OutboundEnvelope>(), null, It.IsAny<IDictionary<string, object>>(),
            It.IsAny<CancellationToken>())).ThrowsAsync(failure);
        await using var db = new CoreDbContext(
            new DbContextOptionsBuilder<CoreDbContext>().UseInMemoryDatabase($"publisher-{Guid.NewGuid():N}").Options);

        var thrown = await Should.ThrowAsync<InvalidOperationException>(
            () => new EventPublisher(_bus.Object, new MessageBusOptions(), db).PublishAsync(CurrencyCreated));

        thrown.ShouldBeSameAs(failure);
        db.OutboundEventFailure.ShouldBeSameAs(failure);
    }

    [Fact]
    public async Task AnOutboundEventThatCannotBeStored_WithNoSavingContext_IsRethrownAsItIs()
    {
        var failure = new InvalidOperationException("outbox down");
        _bus.Setup(b => b.Publish(It.IsAny<OutboundEnvelope>(), null, It.IsAny<IDictionary<string, object>>(),
            It.IsAny<CancellationToken>())).ThrowsAsync(failure);

        var thrown = await Should.ThrowAsync<InvalidOperationException>(
            () => new EventPublisher(_bus.Object, new MessageBusOptions()).PublishAsync(CurrencyCreated));

        thrown.ShouldBeSameAs(failure);
    }

    #endregion
}

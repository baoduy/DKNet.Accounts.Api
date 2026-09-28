using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Text.Json.Serialization;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Features.Currencies.Entities;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.Infra.Services;

/// <summary>
///     The outbound event message (DRK-1773 §3a): <c>{ "type": "&lt;resource&gt;.&lt;verb&gt;", "payload": { … } }</c>.
///     The payload is the declared event serialised the way the HTTP API serialises its responses — camelCase field
///     names and camelCase enum names (<see cref="SharedConsts.JsonSerializerOptions" />) — except that a null field
///     is written as <c>null</c>, so every payload carries its full §3a field set.
/// </summary>
/// <param name="Type">One of the 9 §3a event types.</param>
/// <param name="Payload">The entity's public fields, as declared by its <c>[RaisesEvent]</c> rule.</param>
internal sealed record OutboundEnvelope(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("payload")] JsonElement Payload)
{
    #region Fields

    private static readonly JsonSerializerOptions PayloadOptions = new(SharedConsts.JsonSerializerOptions)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.Never
    };

    /// <summary>Each generated <c>[RaisesEvent]</c> payload record and the §3a event type it is sent as.</summary>
    private static readonly Dictionary<Type, string> EventTypes = new()
    {
        [typeof(CurrencyCreatedEvent)] = "currencies.created",
        [typeof(CurrencyUpdatedEvent)] = "currencies.updated",
        [typeof(AccountGroupCreatedEvent)] = "account-groups.created",
        [typeof(AccountGroupUpdatedEvent)] = "account-groups.updated",
        [typeof(AccountGroupDeletedEvent)] = "account-groups.deleted",
        [typeof(AccountCreatedEvent)] = "accounts.created",
        [typeof(AccountClosedOnExternalReferenceMinimumBalanceNameOverdraftLimitPermittedToGoNegativeStatusUpdatedEvent)] =
            "accounts.updated",
        [typeof(PostingCreatedEvent)] = "postings.created",
        [typeof(PostingStatusUpdatedEvent)] = "postings.updated"
    };

    #endregion

    #region Methods

    /// <summary>Wraps a declared outbound event in its envelope; false for any other event.</summary>
    /// <param name="domainEvent">An event raised by the DKNet save hook.</param>
    /// <param name="envelope">The envelope, when <paramref name="domainEvent" /> is an outbound event.</param>
    public static bool TryWrap(object domainEvent, [NotNullWhen(true)] out OutboundEnvelope? envelope)
    {
        var eventType = domainEvent.GetType();
        envelope = EventTypes.TryGetValue(eventType, out var type)
            ? new OutboundEnvelope(type,
                JsonSerializer.SerializeToElement(domainEvent, eventType, PayloadOptions))
            : null;
        return envelope is not null;
    }

    #endregion
}

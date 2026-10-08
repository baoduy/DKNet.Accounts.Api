using System.Text.Json;
using System.Text.Json.Serialization;
using SlimMessageBus.Host;

namespace DKNet.Accounts.EmailProcessor;

/// <summary>One ledger event as the Accounts API publishes it: <c>{ "type": "&lt;resource&gt;.&lt;verb&gt;",
/// "payload": { … } }</c>, the payload's field names in camelCase.</summary>
internal sealed record LedgerEvent(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("payload")] JsonElement Payload);

/// <summary>The API stamps each message with its own envelope type's name, which this app does not have. The queue
/// carries nothing but ledger events, so every name read off it resolves to <see cref="LedgerEvent" />.</summary>
internal sealed class LedgerEventTypeRedirect : IAssemblyQualifiedNameMessageTypeResolverRedirect
{
    public Type TryGetType(string name) => typeof(LedgerEvent);

    public string? TryGetName(Type messageType) => null;
}

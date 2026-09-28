using RabbitMQ.Client;
using RabbitMQ.Client.Exceptions;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>One message read off the outbound queue: the envelope's <c>type</c> and <c>payload</c> (DRK-1773 §3a)
/// and the transport message id.</summary>
public sealed record OutboundEvent(string? Type, JsonElement Payload, string? MessageId, string Body)
{
    /// <summary>The payload's <c>id</c>, or null when the payload carries none.</summary>
    public Guid? PayloadId =>
        Payload.ValueKind == JsonValueKind.Object
        && Payload.TryGetProperty("id", out var id)
        && id.TryGetGuid(out var guid)
            ? guid
            : null;

    public override string ToString() => $"{Type} {PayloadId} (message id {MessageId ?? "none"}): {Body}";
}

/// <summary>
/// Reads one RabbitMQ queue from the outside, the way a consumer of the ledger's events would. Every message read
/// is acknowledged and kept in <see cref="Received"/>, so a scenario can ask for the same events again. The queue
/// is only ever looked up passively — creating it is the service's job (§3), so a queue that does not exist yet
/// simply reads as empty.
/// </summary>
public sealed class OutboundQueue(string queueName)
{
    private readonly List<OutboundEvent> _received = [];

    public string Name { get; } = queueName;

    /// <summary>Every message read off the queue so far, in arrival order.</summary>
    public IReadOnlyList<OutboundEvent> Received => _received;

    /// <summary>Whether the queue exists on the broker. False while the broker is down.</summary>
    public async Task<bool> ExistsAsync()
    {
        try
        {
            await using var connection = await ConnectAsync();
            await using var channel = await connection.CreateChannelAsync();
            await channel.QueueDeclarePassiveAsync(Name);
            return true;
        }
        catch (Exception e) when (e is RabbitMQClientException or IOException)
        {
            return false;
        }
    }

    /// <summary>Reads every message waiting on the queue into <see cref="Received"/>.</summary>
    public async Task DrainAsync()
    {
        try
        {
            await using var connection = await ConnectAsync();
            await using var channel = await connection.CreateChannelAsync();
            await channel.QueueDeclarePassiveAsync(Name);

            while (await channel.BasicGetAsync(Name, autoAck: true) is { } message)
            {
                _received.Add(Parse(message.Body.ToArray(), message.BasicProperties.MessageId));
            }
        }
        catch (Exception e) when (e is RabbitMQClientException or IOException)
        {
            // Queue not created yet, or broker down: nothing to read right now.
        }
    }

    /// <summary>Drains the queue until <paramref name="condition"/> holds over <see cref="Received"/>, or the
    /// timeout passes. Returns whether it held.</summary>
    public async Task<bool> WaitUntilAsync(Func<IReadOnlyList<OutboundEvent>, bool> condition, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        do
        {
            await DrainAsync();
            if (condition(_received))
            {
                return true;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(250));
        } while (DateTime.UtcNow < deadline);

        return false;
    }

    /// <summary>Keeps draining for <paramref name="window"/>, so an event that should not exist has had every
    /// chance to arrive before a scenario asserts it did not.</summary>
    public async Task SettleAsync(TimeSpan window)
    {
        var deadline = DateTime.UtcNow + window;
        while (DateTime.UtcNow < deadline)
        {
            await DrainAsync();
            await Task.Delay(TimeSpan.FromMilliseconds(250));
        }

        await DrainAsync();
    }

    public string Describe() =>
        _received.Count == 0 ? "the queue received nothing" : string.Join(Environment.NewLine, _received);

    private static Task<IConnection> ConnectAsync() =>
        new ConnectionFactory { Uri = new Uri(OutboundBroker.ConnectionString) }.CreateConnectionAsync();

    private static OutboundEvent Parse(byte[] body, string? messageId)
    {
        var text = Encoding.UTF8.GetString(body);
        try
        {
            using var doc = JsonDocument.Parse(text);
            var root = doc.RootElement;
            var type = root.ValueKind == JsonValueKind.Object && root.TryGetProperty("type", out var t)
                ? t.GetString()
                : null;
            var payload = root.ValueKind == JsonValueKind.Object && root.TryGetProperty("payload", out var p)
                ? p.Clone()
                : default;
            return new OutboundEvent(type, payload, messageId, text);
        }
        catch (JsonException)
        {
            return new OutboundEvent(null, default, messageId, text);
        }
    }
}

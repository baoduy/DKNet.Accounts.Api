using System;
using DKNet.Accounts.Client;
using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>DRK-1638 §5, "The idempotency key is sent as a header" (@unit). The network is stood in for by
/// <see cref="RecordingHandler"/>.</summary>
public sealed class IdempotencyTests
{
    private static readonly Uri ServiceAddress = new("https://accounts.example.test");

    [Fact]
    public async Task TheIdempotencyKeyIsSentAsAHeader()
    {
        const string idempotencyKey = "PAY-2026-09-18-0001";
        var handler = new RecordingHandler
        {
            ResponseBody = "{\"id\":\"11111111-1111-1111-1111-111111111111\",\"accountId\":\"22222222-2222-2222-2222-222222222222\",\"postingNumber\":\"1\",\"direction\":\"Credit\",\"currency\":\"SGD\",\"signedAmount\":10.00}"
        };
        var services = new ServiceCollection();
        services.AddSingleton(handler);
        services.AddAccountClient(ServiceAddress, typeof(RecordingHandler));

        using var provider = services.BuildServiceProvider();
        var client = provider.GetRequiredService<IAccountClient>();

        await client.RecordPostingAsync(
            new RecordPostingRequest
            {
                AccountId = Guid.NewGuid(),
                Direction = PostingDirection.Credit,
                Amount = 10.00m,
                Currency = "SGD",
                Category = PostingCategory.Transfer
            },
            idempotencyKey);

        handler.LastRequest.ShouldNotBeNull();
        handler.LastRequest!.Headers.TryGetValues("Idempotency-Key", out var values).ShouldBeTrue();
        values!.ShouldContain(idempotencyKey);
    }
}

using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.Client;
using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>DRK-2276 §5, "The .NET client records and reads a transfer" (@integration). Drives the real service
/// through <see cref="LedgerApiFixture.CreateClient"/>; the Background's "Alice SGD" (500.00 SGD) and
/// "Carol SGD" (0.00 SGD) Liability accounts are opened through the client too.</summary>
public sealed class TransferClientTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    [Fact]
    public async Task TheDotNetClientRecordsAndReadsATransfer()
    {
        var caller = fixture.CreateClient();
        caller.DefaultRequestHeaders.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
        caller.DefaultRequestHeaders.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', ScopeNames.All));
        var client = new AccountClient(caller);

        var group = await client.CreateAccountGroupAsync(new CreateAccountGroupRequest
        {
            Code = $"T{Guid.NewGuid():N}"[..5].ToUpperInvariant(),
            Name = "Transfers",
            Type = AccountGroupType.Customer,
            OwnerId = "PayHub"
        });
        var alice = await OpenAsync(client, group.Id, "Alice SGD");
        var carol = await OpenAsync(client, group.Id, "Carol SGD");
        await client.RecordPostingAsync(
            new RecordPostingRequest
            {
                AccountId = alice,
                Direction = PostingDirection.Credit,
                Amount = 500.00m,
                Currency = "SGD",
                Category = PostingCategory.Transfer
            },
            $"seed-{Guid.NewGuid():N}");

        var recorded = await client.RecordTransferAsync(
            new RecordTransferRequest
            {
                SourceAccountId = alice,
                DestinationAccountId = carol,
                Amount = 50.00m,
                SourceCurrency = "SGD",
                DestinationCurrency = "SGD",
                Fee = 0.00m
            },
            $"tr-{Guid.NewGuid():N}");
        var read = await client.GetTransferAsync(recorded.Id);

        read.Id.ShouldBe(recorded.Id);
        read.SourceAccountId.ShouldBe(alice);
        read.DestinationAccountId.ShouldBe(carol);
        read.Amount.ShouldBe(50.00m);
        read.ConvertedAmount.ShouldBe(recorded.ConvertedAmount);
        recorded.Postings.Count.ShouldBe(2);
        read.Postings.Count.ShouldBe(2);
        read.Postings.Select(p => p.Id).ShouldBe(recorded.Postings.Select(p => p.Id));
    }

    private static async Task<Guid> OpenAsync(IAccountClient client, Guid groupId, string name) =>
        (await client.OpenAccountAsync(new OpenAccountRequest
        {
            GroupId = groupId,
            Name = name,
            Currency = "SGD",
            Classification = AccountClassification.Liability
        })).Id;
}

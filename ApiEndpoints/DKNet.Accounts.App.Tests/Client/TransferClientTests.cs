using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.Client;
using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>DRK-2276 §5, "The .NET client records and reads a transfer", and DRK-2300 §5, "The .NET client lists an
/// account's transfers" (@integration). Drives the real service through <see cref="LedgerApiFixture.CreateClient"/>;
/// the Background's "Alice SGD" (500.00 SGD) and its 0.00 SGD Liability counterparts are opened through the client
/// too.</summary>
public sealed class TransferClientTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    [Fact]
    public async Task TheDotNetClientRecordsAndReadsATransfer()
    {
        var (client, alice, carol, _) = await ArrangeAsync();

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

    [Fact]
    public async Task TheDotNetClientListsAnAccountsTransfers()
    {
        var (client, alice, bob, fees) = await ArrangeAsync();
        await client.RecordTransferAsync(
            new RecordTransferRequest
            {
                SourceAccountId = alice,
                DestinationAccountId = bob,
                Amount = 100.00m,
                SourceCurrency = "SGD",
                DestinationCurrency = "SGD",
                Fee = 1.00m,
                FeeAccountId = fees
            },
            $"tr-{Guid.NewGuid():N}");
        var refund = await client.RecordTransferAsync(
            new RecordTransferRequest
            {
                SourceAccountId = alice,
                DestinationAccountId = bob,
                Amount = 20.00m,
                SourceCurrency = "SGD",
                DestinationCurrency = "SGD",
                Fee = 0.00m
            },
            "refund-778");

        var page = await client.ListAccountTransfersAsync(alice, new AccountTransfersQuery { Search = "refund" });

        page.PageNumber.ShouldBe(1);
        page.TotalItemCount.ShouldBe(1);
        var row = page.Items.ShouldHaveSingleItem();
        row.Id.ShouldBe(refund.Id);
        row.Amount.ShouldBe(20.00m);
        row.IdempotencyKey.ShouldBe("refund-778");
        typeof(TransferRow).GetProperty("Postings").ShouldBeNull("a listed transfer carries no postings");
    }

    /// <summary>Opens "Alice SGD" holding 500.00 SGD and 2 more SGD Liability accounts holding 0.00, through the
    /// client, as PayHub with every scope.</summary>
    private async Task<(IAccountClient Client, Guid Alice, Guid Second, Guid Third)> ArrangeAsync()
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
        var second = await OpenAsync(client, group.Id, "Bob SGD");
        var third = await OpenAsync(client, group.Id, "Fees SGD");
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
        return (client, alice, second, third);
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

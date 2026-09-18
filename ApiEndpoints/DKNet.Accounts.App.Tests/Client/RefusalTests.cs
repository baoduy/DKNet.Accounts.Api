using System;
using System.Net.Http;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.Client;
using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>DRK-1638 §5 — a refusal reaches the caller as data (R2), never as JSON the caller must parse
/// itself. Drives the real service through <see cref="LedgerApiFixture"/> (@integration).</summary>
public sealed class RefusalTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private HttpClient AuthorisedCaller()
    {
        var caller = fixture.CreateClient();
        caller.DefaultRequestHeaders.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
        caller.DefaultRequestHeaders.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', ScopeNames.All));
        return caller;
    }

    /// <summary>"A refused close reaches the caller as a code, not as JSON." The spec names the group
    /// "CUST-000123" as its narrative identifier (Name, for readability) — its business Code is a separate,
    /// short (3-5 char) field the group-closing assertion never touches.</summary>
    [Fact]
    public async Task ARefusedCloseReachesTheCallerAsACodeNotAsJson()
    {
        var caller = AuthorisedCaller();
        var client = new AccountClient(caller);

        var group = await client.CreateAccountGroupAsync(new CreateAccountGroupRequest
        {
            Code = "CUST1",
            Name = "CUST-000123",
            Type = AccountGroupType.Customer,
            OwnerId = "PayHub"
        });
        var account = await client.OpenAccountAsync(new OpenAccountRequest
        {
            GroupId = group.Id,
            Name = "Operating",
            Currency = "SGD",
            Classification = AccountClassification.Asset
        });
        await client.RecordPostingAsync(
            new RecordPostingRequest
            {
                AccountId = account.Id,
                Direction = PostingDirection.Credit,
                Amount = 100.00m,
                Currency = "SGD",
                Category = PostingCategory.Transfer
            },
            idempotencyKey: $"seed-{Guid.NewGuid():N}");

        var exception = await Should.ThrowAsync<AccountApiException>(() => client.CloseAccountGroupAsync(group.Id));

        exception.Errors.ShouldContain(e => e.Code == "GROUP_HOLDS_BALANCE");
    }

    /// <summary>"A refused input reaches the caller as the name of the refused field." A 2-letter currency
    /// code fails the service's own <c>^[A-Za-z]{3}$</c> shape rule on <c>Code</c> (validation, not a
    /// business-rule refusal), so the refusal carries a field name, not a business code.</summary>
    [Fact]
    public async Task ARefusedInputReachesTheCallerAsTheNameOfTheRefusedField()
    {
        var caller = AuthorisedCaller();
        var client = new AccountClient(caller);

        var exception = await Should.ThrowAsync<AccountApiException>(() => client.CreateCurrencyAsync(
            new CreateCurrencyRequest { Code = "EU", Name = "Euro", DecimalPlaces = 2 }));

        exception.Errors.ShouldContain(e => e.Field == "Code");
    }
}

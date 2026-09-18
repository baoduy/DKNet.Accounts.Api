using System;
using System.Collections.Generic;
using System.Linq;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.Client;
using DKNet.Accounts.Client.Contracts;
using DKNet.Accounts.Infra.Contexts;
using DomainAccount = DKNet.Accounts.Domains.Features.Accounts.Entities.Account;
using DomainAccountClassification = DKNet.Accounts.Domains.Features.Accounts.Entities.AccountClassification;
using DomainAccountStatus = DKNet.Accounts.Domains.Features.Accounts.Entities.AccountStatus;
using DomainAccountGroup = DKNet.Accounts.Domains.Features.AccountGroups.Entities.AccountGroup;
using DomainAccountGroupType = DKNet.Accounts.Domains.Features.AccountGroups.Entities.AccountGroupType;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>DRK-1638 §5 — "An account listing takes each kind of argument directly" (Scenario Outline,
/// @integration) and "A paged account listing says whether a further page exists". Seeds 120 accounts
/// directly through <see cref="LedgerApiFixture.CreateScope"/> (the spec's own slice note: "reuse the
/// fixture's reset + seed path; no new harness") rather than 120 round trips through the client under
/// test.</summary>
public sealed class AccountListingTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const int TotalAccounts = 120;
    private const int ClosedAccounts = 20;
    private const int TreasuryAccounts = 5;

    private async Task<Guid> Seed120AccountsAsync()
    {
        using var scope = fixture.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();

        var group = new DomainAccountGroup("CUST2", "CUST-000123", null, DomainAccountGroupType.Customer, "PayHub", null);
        // No HttpContext in this direct-DbContext seed path, so there is no authenticated principal for
        // DataOwnerHook to stamp CreatedBy from — set it directly through the change tracker before saving,
        // the same way TestApiFactoryBase.SeedCurrenciesAsync seeds reference data.
        db.Add(group).Property("CreatedBy").CurrentValue = "system";

        for (var i = 0; i < TotalAccounts; i++)
        {
            var name = i < TreasuryAccounts ? $"treasury desk {i:D2}" : $"Account {i:D3}";
            var account = new DomainAccount(
                group.Id, $"ACC{i:D4}", name, "SGD", DomainAccountClassification.Asset,
                permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null,
                externalReference: null, metadata: null);
            if (i < ClosedAccounts)
            {
                typeof(DomainAccount).GetProperty(nameof(DomainAccount.Status))!.SetValue(account, DomainAccountStatus.Closed);
            }

            db.Add(account).Property("CreatedBy").CurrentValue = "system";
        }

        await db.SaveChangesAsync();
        return group.Id;
    }

    private AccountClient AuthorisedClient()
    {
        var caller = fixture.CreateClient();
        caller.DefaultRequestHeaders.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
        caller.DefaultRequestHeaders.Add(LedgerCallerAuthHandler.ScopesHeaderName, ScopeNames.AccountsRead);
        return new AccountClient(caller);
    }

    [Fact]
    public async Task AnAccountListingTakesTheFilterArgumentDirectly()
    {
        var groupId = await Seed120AccountsAsync();
        var client = AuthorisedClient();

        var page = await client.GetAccountsAsync(new AccountsListQuery
        {
            Filters = [new ListFilter("GroupId", "Equal", groupId.ToString()), new ListFilter("Status", "Equal", "Active")]
        });

        page.Items.ShouldNotBeEmpty();
        page.Items.ShouldAllBe(a => a.Status == AccountStatus.Active);
        page.Items.Count.ShouldBe(TotalAccounts - ClosedAccounts);
    }

    [Fact]
    public async Task AnAccountListingTakesTheSearchArgumentDirectly()
    {
        var groupId = await Seed120AccountsAsync();
        var client = AuthorisedClient();

        var page = await client.GetAccountsAsync(new AccountsListQuery
        {
            Filters = [new ListFilter("GroupId", "Equal", groupId.ToString())],
            Search = "treasury"
        });

        page.Items.Count.ShouldBe(TreasuryAccounts);
        page.Items.ShouldAllBe(a => a.Name.Contains("treasury", StringComparison.Ordinal));
    }

    [Fact]
    public async Task AnAccountListingTakesTheOrderingArgumentDirectly()
    {
        var groupId = await Seed120AccountsAsync();
        var client = AuthorisedClient();

        var page = await client.GetAccountsAsync(new AccountsListQuery
        {
            Filters = [new ListFilter("GroupId", "Equal", groupId.ToString())],
            OrderBy = "Name",
            PageSize = TotalAccounts
        });

        var expected = page.Items.OrderBy(a => a.Name, StringComparer.Ordinal).Select(a => a.Name).ToList();
        page.Items.Select(a => a.Name).ToList().ShouldBe(expected);
    }

    [Fact]
    public async Task AnAccountListingTakesThePageSizeArgumentDirectly()
    {
        var groupId = await Seed120AccountsAsync();
        var client = AuthorisedClient();

        var page = await client.GetAccountsAsync(new AccountsListQuery
        {
            Filters = [new ListFilter("GroupId", "Equal", groupId.ToString())],
            PageSize = 50
        });

        page.Items.Count.ShouldBe(50);
    }

    /// <summary>"A paged account listing says whether a further page exists."</summary>
    [Fact]
    public async Task APagedAccountListingSaysWhetherAFurtherPageExists()
    {
        var groupId = await Seed120AccountsAsync();
        var client = AuthorisedClient();

        var page = await client.GetAccountsAsync(new AccountsListQuery
        {
            Filters = [new ListFilter("GroupId", "Equal", groupId.ToString())],
            PageSize = 50
        });

        page.HasNextPage.ShouldBeTrue();
    }
}

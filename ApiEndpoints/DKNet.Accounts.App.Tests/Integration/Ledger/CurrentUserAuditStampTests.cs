using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// DRK-1467 §5 (accounts-service phase): "The accounts service records the creator with no tenant-ownership
/// feature in place" and "…records the signed-in user as the last editor of a change". R1: a test that passes
/// only because both the old ownership-key path and the new signed-in-user path read the same claim does not
/// satisfy either scenario — <see cref="NoTenantOwnershipApiFixture"/> removes <c>IDataOwnerProvider</c> and
/// its hook entirely (matched by service-type name, since this test project carries no compile-time
/// reference to <c>DKNet.EfCore.DataAuthorization</c>), so today (before <c>PrincipalProvider</c>/
/// <c>ServiceConfigs</c> migrate onto
/// <c>ICurrentUserProvider</c>) nothing stamps <c>CreatedBy</c>/<c>UpdatedBy</c> at all — both tests below are
/// RED on that plain, nameable assertion failure.
/// </summary>
public sealed class CurrentUserAuditStampTests(NoTenantOwnershipApiFixture fixture)
    : IClassFixture<NoTenantOwnershipApiFixture>
{
    private const string ActingSubjectId = "9f2c1b44-0a7e-4c3d-8b21-77d9e5a10c62";

    private HttpClient Client => fixture.CreateClient();

    private static HttpRequestMessage AsTreasuryOps(HttpMethod method, string uri, object? body = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "treasury-ops");
        request.Headers.Add(LedgerCallerAuthHandler.SubjectHeaderName, ActingSubjectId);
        request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', ScopeNames.All));
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    /// <summary>Seeds the group directly rather than through the (currently broken, by design) save pipeline
    /// under test: <c>CreatedBy</c> is a required column with nothing left to stamp it, so setup writes it via
    /// the tracked <c>PropertyEntry</c> instead — so only the scenario's own "When" step exercises the
    /// stamping under test.</summary>
    private async Task<Guid> SeedGroupAsync(string code)
    {
        using var scope = fixture.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var group = new AccountGroup(code, code, null, AccountGroupType.Customer, "default-owner", null);
        db.Add(group);
        db.Entry(group).Property(nameof(AccountGroup.CreatedBy)).CurrentValue = "seed-setup";
        await db.SaveChangesAsync();
        return group.Id;
    }

    [Fact]
    public async Task OpeningAnAccount_WithNoTenantOwnershipFeatureRegistered_RecordsTheSignedInUserAsCreator()
    {
        var groupId = await SeedGroupAsync($"TRE-{Guid.NewGuid():N}"[..12]);

        var response = await Client.SendAsync(AsTreasuryOps(HttpMethod.Post, "/v1/accounts", new
        {
            groupId,
            name = "Operating SGD",
            currency = "SGD",
            classification = "Liability",
            permittedToGoNegative = false
        }));

        string? createdBy = null;
        if (response.IsSuccessStatusCode)
        {
            var accountId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
            using var scope = fixture.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
            createdBy = (await db.Set<Account>().AsNoTracking().SingleAsync(a => a.Id == accountId)).CreatedBy;
        }

        createdBy.ShouldBe(ActingSubjectId);
    }

    [Fact]
    public async Task RenamingAnAccountGroup_WithNoTenantOwnershipFeatureRegistered_RecordsTheSignedInUserAsLastEditor()
    {
        var groupId = await SeedGroupAsync($"TRE-{Guid.NewGuid():N}"[..12]);

        await Client.SendAsync(AsTreasuryOps(HttpMethod.Put, $"/v1/account-groups/{groupId}", new
        {
            name = "Treasury SGD"
        }));

        using var scope = fixture.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var updatedBy = (await db.Set<AccountGroup>().AsNoTracking().SingleAsync(g => g.Id == groupId)).UpdatedBy;

        updatedBy.ShouldBe(ActingSubjectId);
    }
}

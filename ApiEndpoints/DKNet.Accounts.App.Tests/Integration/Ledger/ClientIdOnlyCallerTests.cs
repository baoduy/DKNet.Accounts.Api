using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Infra.Contexts;
using Microsoft.EntityFrameworkCore;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// Drives <c>PrincipalProvider.Initialize</c>'s <c>client_id</c> fallback (DRK-1277 §12) end to end: a caller
/// shaped like a real machine-to-machine credential — <c>client_id</c> only, no subject claim — must still be
/// able to create an account group, with <c>DataOwnerHook</c> stamping <see cref="AccountGroup.CreatedBy"/>
/// from that fallback key. <see cref="PrincipalProviderTests"/> only proves <c>GetOwnershipKey()</c> returns
/// the key in isolation; this proves the rest of the chain (<c>DataOwnerHook</c> stamping,
/// <c>CoreDbContext.EnsureOwnershipResolvable</c> not throwing) actually accepts it. The mutation this test
/// must catch: removing the <c>client_id</c> fallback from <c>PrincipalProvider.Initialize</c> turns the
/// create request into a 403 (<c>OwnershipRequiredException</c>) instead of 201.
/// </summary>
public sealed class ClientIdOnlyCallerTests(AuthOnClientIdOnlyApiFixture fixture)
    : IClassFixture<AuthOnClientIdOnlyApiFixture>
{
    private HttpClient Client => fixture.CreateClient();

    [Fact]
    public async Task CreatingAnAccountGroup_WithNoSubjectClaim_StampsCreatedByFromTheClientIdFallback()
    {
        var code = $"M2M-{Guid.NewGuid():N}"[..12];
        var request = new HttpRequestMessage(HttpMethod.Post, "/v1/account-groups");
        request.Headers.Add(ClientIdOnlyAuthHandler.ClientIdHeaderName, "PayHub");
        request.Headers.Add(ClientIdOnlyAuthHandler.ScopesHeaderName, ScopeNames.AccountsWrite);
        request.Content = JsonContent.Create(new
        {
            code,
            name = code,
            type = "Customer",
            ownerId = "default-owner"
        });

        var response = await Client.SendAsync(request);

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = body.GetProperty("id").GetGuid();

        using var scope = fixture.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var group = await db.Set<AccountGroup>().AsNoTracking().FirstOrDefaultAsync(g => g.Id == id);
        group.ShouldNotBeNull();
        group.CreatedBy.ShouldBe("PayHub");
    }
}

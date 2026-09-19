using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// DRK-1467 §5: "Activating an account group needs no request body" — the caller sends no body and no
/// content-type at all; a JSON body of <c>{}</c> is a different scenario and R4 says it does not satisfy this
/// one. NOTE for dev-leader's AT approval: this scenario is already green under today's hand-mapped
/// <c>{id:guid}/activate</c> route (it never bound a request body in the first place — see
/// <see cref="AccountGroupsHandlerTests.Updating_RenamesDescribesClosesAndReactivates_AllApply"/>, which
/// already exercises the same no-body activate call). The paired
/// <see cref="Architecture.AccountGroupExcludedRoutesTests"/> is what is actually RED today for row 11 (moving
/// Activate onto the generated composite) — this scenario proves the outward HTTP contract does not regress
/// across that move, which is the point of it being written down, even though it was never going to fail.
/// </summary>
public sealed class ActivateAccountGroupNoBodyTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private HttpClient Client => fixture.CreateClient();

    private static HttpRequestMessage AsPayHub(HttpMethod method, string uri, object? body = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
        request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', ScopeNames.All));
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    [Fact]
    public async Task ActivatingAClosedGroup_WithNoBodyAndNoContentType_SucceedsAndReturnsTheGroup()
    {
        var code = $"A{Guid.NewGuid():N}"[..5].ToUpperInvariant();
        var created = await Client.SendAsync(AsPayHub(HttpMethod.Post, "/v1/account-groups", new
        {
            code, name = code, type = "Customer", ownerId = "PayHub"
        }));
        created.EnsureSuccessStatusCode();
        var groupId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var closed = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"/v1/account-groups/{groupId}/close"));
        closed.StatusCode.ShouldBe(HttpStatusCode.OK);

        var request = new HttpRequestMessage(HttpMethod.Post, $"/v1/account-groups/{groupId}/activate");
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
        request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', ScopeNames.All));
        request.Content.ShouldBeNull();

        var response = await Client.SendAsync(request);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("id").GetGuid().ShouldBe(groupId);
        body.GetProperty("status").GetString().ShouldBe("active");
    }
}

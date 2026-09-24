using System.Net.Http.Headers;
using Microsoft.IdentityModel.Tokens;
using DKNet.Accounts.App.Tests.Integration.Support;

namespace DKNet.Accounts.App.Tests.Integration.Auth;

/// <summary>
/// DRK-1736: with <c>RequireAuthorization</c> on, a real signed bearer token goes through the service's own
/// <c>JwtBearerHandler</c> setup (<see cref="SignedTokenApiFixture" />) and its claims must reach the scope check,
/// <c>IPrincipalProvider</c> and <c>User.Identity.Name</c> under the names the token was issued with.
/// </summary>
/// <remarks>
/// S1, S4 and S5 are red today: the default inbound claim mapping renames <c>scp</c> and <c>email</c> before
/// <c>HasScopeHandler</c> / <c>PrincipalProvider</c> read them, and <c>Identity.Name</c> is not read from the
/// token's <c>name</c> claim. S2 (the fix must not widen access), S3 (<c>scope</c> still authorizes) and S6 (the
/// ownership key already resolves from the mapped <c>oid</c>) are green from authoring: they guard behaviour the fix
/// must keep. The harness control proves the fixture's tokens are signature-checked, not waved through.
/// </remarks>
public sealed class SignedTokenClaimNamesTests(SignedTokenApiFixture fixture) : IClassFixture<SignedTokenApiFixture>
{
    private const string AccountsRoute = "/v1/accounts";

    private async Task<HttpResponseMessage> GetAccountsAsync(IDictionary<string, object> claims)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, AccountsRoute);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fixture.MintToken(claims));
        return await fixture.CreateClient().SendAsync(request);
    }

    private static string? Header(HttpResponseMessage response, string name) =>
        response.Headers.TryGetValues(name, out var values) ? values.Single() : null;

    [Fact]
    public async Task HarnessControl_TokenSignedWithAnotherKey_IsRejectedAsUnauthenticated()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, AccountsRoute);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fixture.MintToken(
            new Dictionary<string, object> { ["scope"] = "accounts.read" },
            new SymmetricSecurityKey(new byte[32])));

        var response = await fixture.CreateClient().SendAsync(request);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task S1_TokenWhoseScpCarriesAccountsRead_ListsAccounts()
    {
        var response = await GetAccountsAsync(new Dictionary<string, object>
        {
            ["oid"] = "5b0e6a3c-2f4d-4c1e-9a7b-8d2f1e0c3b4a",
            ["scp"] = "accounts.read postings.read"
        });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task S2_TokenWhoseScpCarriesOnlyPostingsRead_IsForbiddenFromListingAccounts()
    {
        var response = await GetAccountsAsync(new Dictionary<string, object>
        {
            ["oid"] = "5b0e6a3c-2f4d-4c1e-9a7b-8d2f1e0c3b4a",
            ["scp"] = "postings.read"
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task S3_TokenWhoseScopeClaimCarriesAccountsRead_ListsAccounts()
    {
        var response = await GetAccountsAsync(new Dictionary<string, object>
        {
            ["oid"] = "5b0e6a3c-2f4d-4c1e-9a7b-8d2f1e0c3b4a",
            ["scope"] = "accounts.read"
        });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task S4_TokenWithEmail_ResolvesThatEmailAsThePrincipalEmail()
    {
        var response = await GetAccountsAsync(new Dictionary<string, object>
        {
            ["oid"] = "5b0e6a3c-2f4d-4c1e-9a7b-8d2f1e0c3b4a",
            ["email"] = "mai@drunkcoding.net",
            ["scp"] = "accounts.read"
        });

        Header(response, PrincipalProbeStartupFilter.EmailHeader).ShouldBe("mai@drunkcoding.net");
    }

    /// <summary>The token carries no <c>email</c>, so <c>UserName</c> cannot come from the email fallback in
    /// <c>PrincipalProvider</c> — only from <c>Identity.Name</c>.</summary>
    [Fact]
    public async Task S5_TokenWithName_ResolvesThatNameAsIdentityNameAndUserName()
    {
        var response = await GetAccountsAsync(new Dictionary<string, object>
        {
            ["oid"] = "5b0e6a3c-2f4d-4c1e-9a7b-8d2f1e0c3b4a",
            ["name"] = "Mai Tran",
            ["scp"] = "accounts.read"
        });

        Header(response, PrincipalProbeStartupFilter.IdentityNameHeader).ShouldBe("Mai Tran");
        Header(response, PrincipalProbeStartupFilter.UserNameHeader).ShouldBe("Mai Tran");
    }

    [Fact]
    public async Task S6_TokenWithOid_ResolvesThatOidAsTheOwnershipKey()
    {
        var response = await GetAccountsAsync(new Dictionary<string, object>
        {
            ["oid"] = "5b0e6a3c-2f4d-4c1e-9a7b-8d2f1e0c3b4a",
            ["scp"] = "accounts.read"
        });

        Header(response, PrincipalProbeStartupFilter.OwnershipKeyHeader)
            .ShouldBe("5b0e6a3c-2f4d-4c1e-9a7b-8d2f1e0c3b4a");
    }
}

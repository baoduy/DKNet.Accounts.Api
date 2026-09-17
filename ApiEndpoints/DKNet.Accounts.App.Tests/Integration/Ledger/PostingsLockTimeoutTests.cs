using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Share;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// Covers the one refusal branch no acceptance scenario can reach without sustained lock contention: Record,
/// RecordBatch and Reverse all catch the account lock's <see cref="TimeoutException"/> and refuse with
/// LOCK_TIMEOUT rather than letting the request hang or crash. <see cref="LockTimeoutApiFixture"/> swaps in a
/// lock provider that always times out.
/// </summary>
public sealed class PostingsLockTimeoutTests(LockTimeoutApiFixture fixture) : IClassFixture<LockTimeoutApiFixture>
{
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

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

    private async Task<Guid> OpenAccountAsync()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = Guid.NewGuid(),
            name = "Operating",
            currency = "SGD",
            classification = "Liability"
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    /// <summary>Seeds a posting directly (Record itself needs the lock this fixture always denies), so
    /// Reverse's own lock-timeout path can be reached independently of Record's. CreatedBy is left for
    /// DataOwnerHook to stamp on save (DRK-1372 §5), so this scope needs its own authenticated HttpContext —
    /// there is no real request here to supply one — carrying the same "client_id" claim the endpoint calls
    /// authenticate with.</summary>
    private async Task<Guid> SeedPostingAsync(Guid accountId)
    {
        using var scope = fixture.CreateScope();
        scope.ServiceProvider.GetRequiredService<IHttpContextAccessor>().HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("client_id", "PayHub")], "Test"))
        };
        var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var posting = new Posting(
            accountId, "PST0000000001", 1, PostingDirection.Credit, 50m, "SGD", 50m, 50m,
            DateOnly.FromDateTime(DateTime.UtcNow), DateTimeOffset.UtcNow, PostingCategory.Transfer,
            null, null, null, "PayHub", null, null, null, null, null);
        dbContext.Set<Posting>().Add(posting);
        await dbContext.SaveChangesAsync();
        return posting.Id;
    }

    [Fact]
    public async Task Record_RefusesWithLockTimeout_WhenTheAccountLockCannotBeAcquired()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId = Guid.NewGuid(),
            direction = "Credit",
            amount = 10m,
            currency = "SGD",
            category = "Transfer"
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.LockTimeout)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.LockTimeout}, got: {body}");
    }

    [Fact]
    public async Task RecordBatch_RefusesWithLockTimeout_WhenAnAccountLockCannotBeAcquired()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = Guid.NewGuid(), direction = "Credit", amount = 10m, currency = "SGD", category = "Transfer" }
            }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.LockTimeout)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.LockTimeout}, got: {body}");
    }

    [Fact]
    public async Task Reverse_RefusesWithLockTimeout_WhenTheAccountLockCannotBeAcquired()
    {
        var accountId = await OpenAccountAsync();
        var postingId = await SeedPostingAsync(accountId);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/{postingId}/reverse"));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.LockTimeout)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.LockTimeout}, got: {body}");
    }
}

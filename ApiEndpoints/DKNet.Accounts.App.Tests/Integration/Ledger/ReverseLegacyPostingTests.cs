using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// DRK-1813 rules R1 and R2 on rows the public API can no longer produce, seeded straight through
/// <see cref="CoreDbContext"/>: a hand-labelled <see cref="PostingCategory.Reversal"/> posting with no lineage
/// (recorded before the record route refused that category) stays reversible, and a reversal that is itself
/// already reversed answers POSTING_ALREADY_REVERSED — the already-reversed check runs before the is-a-reversal one.
/// </summary>
public sealed class ReverseLegacyPostingTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private const string AccountsPath = "/v1/accounts";
    private const string PostingsPath = "/v1/postings";

    private HttpClient Client => fixture.CreateClient();

    private static HttpRequestMessage AsPayHub(HttpMethod method, string uri, object? body = null, string? idempotencyKey = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
        request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', ScopeNames.All));
        if (idempotencyKey is not null)
        {
            request.Headers.Add("Idempotency-Key", idempotencyKey);
        }

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    private async Task<Guid> OpenAccountAsync()
    {
        var group = await Client.SendAsync(AsPayHub(HttpMethod.Post, "/v1/account-groups", new
        {
            code = $"G{Guid.NewGuid():N}"[..5].ToUpperInvariant(),
            name = "Fixture Group",
            type = "Customer",
            ownerId = "PayHub"
        }));
        group.EnsureSuccessStatusCode();
        var groupId = (await group.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId,
            name = "Operating",
            currency = "SGD",
            classification = "Liability"
        }));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private async Task<Guid> RecordCreditAsync(Guid accountId, decimal amount)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId,
            direction = "Credit",
            amount,
            currency = "SGD",
            category = "Transfer"
        }));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private Task<HttpResponseMessage> ReverseAsync(Guid postingId) =>
        Client.SendAsync(AsPayHub(
            HttpMethod.Post, $"{PostingsPath}/{postingId}/reverse", new { reason = "Recorded in error" },
            $"rev-{Guid.NewGuid():N}"));

    private async Task<JsonElement> GetPostingAsync(Guid postingId) =>
        await (await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{PostingsPath}/{postingId}")))
            .Content.ReadFromJsonAsync<JsonElement>();

    private readonly record struct AccountSnapshot(decimal Balance, long StreamPosition, int StatementLength);

    private async Task<AccountSnapshot> SnapshotAsync(Guid accountId)
    {
        var account = await (await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{accountId}")))
            .Content.ReadFromJsonAsync<JsonElement>();
        var statement = await (await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{accountId}/statement")))
            .Content.ReadFromJsonAsync<JsonElement>();

        return new AccountSnapshot(
            account.GetProperty("balance").GetDecimal(),
            account.GetProperty("streamPosition").GetInt64(),
            statement.GetProperty("items").GetArrayLength());
    }

    /// <summary>A scope whose saves DataOwnerHook can stamp: there is no real request here to supply the
    /// authenticated caller, so the scope carries the same "client_id" claim the endpoint calls do.</summary>
    private IServiceScope CreateCallerScope()
    {
        var scope = fixture.CreateScope();
        scope.ServiceProvider.GetRequiredService<IHttpContextAccessor>().HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("client_id", "PayHub")], "Test"))
        };
        return scope;
    }

    [Fact]
    public async Task Reverse_ALegacyReversalCategoryPostingWithNoLineage_IsReversed()
    {
        // R1: "is a reversal" is the back-link, never the category. A posting hand-labelled Reversal through
        // the old record route carries no ReversesPostingId, so it stays reversible.
        var account = await OpenAccountAsync();
        var legacy = await RecordCreditAsync(account, 100m);
        using (var scope = CreateCallerScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
            var posting = await dbContext.Set<Posting>().SingleAsync(p => p.Id == legacy);
            dbContext.Entry(posting).Property(p => p.Category).CurrentValue = PostingCategory.Reversal;
            await dbContext.SaveChangesAsync();
        }

        var response = await ReverseAsync(legacy);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var original = await GetPostingAsync(legacy);
        original.GetProperty("category").GetString().ShouldBe("reversal");
        original.GetProperty("status").GetString().ShouldBe("reversed");
    }

    [Fact]
    public async Task Reverse_AReversalThatIsAlreadyReversed_IsRefusedAlreadyReversed()
    {
        // R2: a posting that is both a reversal and already reversed answers the existing
        // POSTING_ALREADY_REVERSED — that check runs first.
        var account = await OpenAccountAsync();
        var original = await RecordCreditAsync(account, 100m);
        var reversal = await RecordCreditAsync(account, 50m);
        var reversalOfReversal = await RecordCreditAsync(account, 25m);
        using (var scope = CreateCallerScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
            var posting = await dbContext.Set<Posting>().SingleAsync(p => p.Id == reversal);
            posting.LinkAsReversalOf(original);
            posting.MarkReversedBy(reversalOfReversal);
            await dbContext.SaveChangesAsync();
        }

        var before = await SnapshotAsync(account);

        var response = await ReverseAsync(reversal);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity, body.ToString());
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var code) && code.GetString() == "POSTING_ALREADY_REVERSED")
            .ShouldBeTrue($"expected an error carrying code POSTING_ALREADY_REVERSED, got: {body}");
        (await SnapshotAsync(account)).ShouldBe(before);
    }
}

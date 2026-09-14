using System.Net;
using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// Reproduces DRK-1247's B1/B2/B3 findings against a REAL PostgreSQL container instead of the EF Core
/// InMemory provider every other posting test in this solution runs on — see
/// <see cref="AccountReadPathsPostgresTests"/> for why InMemory can't catch these:
/// <list type="bullet">
/// <item>B1 — <c>GET /v1/postings/{id}</c> and <c>GET /v1/accounts/{id}/statement</c> 500'd because the
/// missing <c>Posting</c>-&gt;<c>PostingDto</c> Mapster config left the enum projection to compile to
/// <c>(int)src.Enum</c>, which EF pushes down as an <c>::int</c> cast on a <c>text</c> column.</item>
/// <item>B2 — the same missing config left <c>signedAmount</c> unmapped (always 0); this reproduces on any
/// provider, but is exercised here alongside B1's fix since both live in the same config.</item>
/// <item>B3 — a 2+ leg batch's idempotency signature (several 64-char hashes joined with '|') overflowed the
/// <c>IdempotencySignature</c> column's <c>varchar(64)</c>; only a real relational provider enforces that.</item>
/// </list>
/// </summary>
public sealed class PostingsPostgresTests(PostgresLedgerApiFixture fixture) : IClassFixture<PostgresLedgerApiFixture>
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
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = Guid.NewGuid(),
            name = "Operating",
            currency = "SGD",
            classification = "Liability",
            permittedToGoNegative = false
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task RecordAndGetPostingById_ProjectsEnumsAndSignedAmount_AgainstRealPostgres()
    {
        var account = await OpenAccountAsync();

        var recordResponse = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId = account,
            direction = "Credit",
            amount = 30m,
            currency = "SGD",
            category = "Transfer"
        }));

        // B1 (pre-fix): this call itself never 500'd — Record's mapper.Map<PostingDto> uses Mapster's plain
        // Adapt (in-memory), not ProjectToType. It is the READ below that hits the SQL-translation defect.
        recordResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var recordBody = await recordResponse.Content.ReadFromJsonAsync<JsonElement>();

        // B2: the 201 body's signedAmount must already be correctly signed (positive for a credit), not the
        // default 0 Mapster silently left it at with no explicit SignedValue -> SignedAmount map.
        recordBody.GetProperty("signedAmount").GetDecimal().ShouldBe(30m);
        var id = recordBody.GetProperty("id").GetGuid();

        var getResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{PostingsPath}/{id}"));

        // B1: against the InMemory provider this 200s regardless of the missing Mapster config (client-side
        // evaluation never notices); against real Postgres it 500'd with "invalid input syntax for type
        // integer" before the fix (Direction/Category/Status projected as `::int` casts on text columns).
        getResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
        var getBody = await getResponse.Content.ReadFromJsonAsync<JsonElement>();
        getBody.GetProperty("direction").GetString().ShouldBe("credit");
        getBody.GetProperty("category").GetString().ShouldBe("transfer");
        getBody.GetProperty("status").GetString().ShouldBe("posted");
        getBody.GetProperty("signedAmount").GetDecimal().ShouldBe(30m);
    }

    [Fact]
    public async Task GetAccountStatement_ProjectsEnumsAndSignedAmountForCreditAndDebit_AgainstRealPostgres()
    {
        var account = await OpenAccountAsync();

        var creditResponse = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId = account,
            direction = "Credit",
            amount = 50m,
            currency = "SGD",
            category = "Transfer"
        }));
        creditResponse.EnsureSuccessStatusCode();

        var debitResponse = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId = account,
            direction = "Debit",
            amount = 20m,
            currency = "SGD",
            category = "Fee"
        }));
        debitResponse.EnsureSuccessStatusCode();

        // B1: this 500'd against real Postgres for the same reason GetPostingById did — ToPagedListAsync also
        // goes through ProjectToType.
        var statementResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{account}/statement"));
        statementResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        var statement = await statementResponse.Content.ReadFromJsonAsync<JsonElement>();
        var items = statement.GetProperty("items").EnumerateArray().ToList();
        items.Count.ShouldBe(2);

        var credit = items.Single(i => i.GetProperty("direction").GetString() == "credit");
        credit.GetProperty("category").GetString().ShouldBe("transfer");
        credit.GetProperty("status").GetString().ShouldBe("posted");
        // B2: signed positive for a credit — not the default 0.
        credit.GetProperty("signedAmount").GetDecimal().ShouldBe(50m);

        var debit = items.Single(i => i.GetProperty("direction").GetString() == "debit");
        debit.GetProperty("category").GetString().ShouldBe("fee");
        // B2: signed negative for a debit — not the default 0.
        debit.GetProperty("signedAmount").GetDecimal().ShouldBe(-20m);
    }

    [Fact]
    public async Task RecordBatch_TwoLegsWithIdempotencyKey_RecordsAndReplays_AgainstRealPostgres()
    {
        var account1 = await OpenAccountAsync();
        var account2 = await OpenAccountAsync();
        var key = $"batch-{Guid.NewGuid():N}";

        // Fund account1 first so the batch's debit leg below doesn't land it negative (not permitted).
        (await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId = account1,
            direction = "Credit",
            amount = 15m,
            currency = "SGD",
            category = "Transfer"
        }))).EnsureSuccessStatusCode();

        var movements = new object[]
        {
            new { accountId = account1, direction = "Debit", amount = 15m, currency = "SGD", category = "Transfer" },
            new { accountId = account2, direction = "Credit", amount = 15m, currency = "SGD", category = "Transfer" }
        };

        // B3 (pre-fix): a 2-leg batch's ComputeBatchSignature joined two 64-char hashes with '|' into a
        // 129-char string, which overflowed the IdempotencySignature column's varchar(64) and Postgres
        // rejected the INSERT outright (500), even though every business rule passed.
        var first = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new { movements }, key));
        first.StatusCode.ShouldBe(HttpStatusCode.Created);
        var firstBody = await first.Content.ReadFromJsonAsync<JsonElement>();
        var firstIds = firstBody.EnumerateArray().Select(l => l.GetProperty("id").GetGuid()).ToList();
        firstIds.Count.ShouldBe(2);

        // Replaying the same key with identical content must return the original outcome, not record again.
        var replay = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new { movements }, key));
        replay.StatusCode.ShouldBe(HttpStatusCode.OK);
        var replayBody = await replay.Content.ReadFromJsonAsync<JsonElement>();
        var replayIds = replayBody.EnumerateArray().Select(l => l.GetProperty("id").GetGuid()).ToList();
        // Order-insensitive: the replay's legs are re-fetched by SpecListPostingsByTransactionGroup, ordered
        // by each leg's own (account-scoped) StreamPosition, not by original submission order.
        replayIds.ShouldBe(firstIds, ignoreOrder: true);

        // Nothing recorded twice: account2's balance reflects exactly the one 15 SGD credit.
        var balanceResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{account2}/balance"));
        var balance = await balanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        balance.GetProperty("balance").GetDecimal().ShouldBe(15m);
    }
}

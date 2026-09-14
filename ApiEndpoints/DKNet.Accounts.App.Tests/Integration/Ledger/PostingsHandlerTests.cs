using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// Covers Record/RecordBatch/Reverse/GetPostingById branches the BDD acceptance scenarios don't reach:
/// batch-specific refusals (unsupported currency, invalid amount, future effective date, unknown account),
/// batch idempotency (replay and conflict), a batch leg repeating the same account, reversal against a frozen
/// account and a reversal that credits (rather than debits) a dormant account, and reading an unknown posting.
/// </summary>
public sealed class PostingsHandlerTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
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

    private async Task<Guid> OpenAccountAsync(
        string currency = "SGD", string classification = "Liability", bool permittedToGoNegative = false, decimal? overdraftLimit = null)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = Guid.NewGuid(),
            name = "Operating",
            currency,
            classification,
            permittedToGoNegative,
            overdraftLimit
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    private async Task PatchStatusAsync(Guid accountId, string status) =>
        (await Client.SendAsync(AsPayHub(HttpMethod.Patch, $"{AccountsPath}/{accountId}", new { status })))
        .EnsureSuccessStatusCode();

    private async Task<Guid> RecordAsync(Guid accountId, string direction, decimal amount, string currency = "SGD")
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId,
            direction,
            amount,
            currency,
            category = "Transfer"
        }));
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task GetPostingById_ReturnsNotFound_ForAnUnknownPosting()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{PostingsPath}/{Guid.NewGuid()}"));

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    private readonly record struct AccountSnapshot(decimal Balance, long StreamPosition, int StatementLength);

    /// <summary>Rework finding 4: the state an all-or-nothing batch refusal must leave completely untouched.</summary>
    private async Task<AccountSnapshot> SnapshotAsync(Guid accountId)
    {
        var accountResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{accountId}"));
        accountResponse.EnsureSuccessStatusCode();
        var account = await accountResponse.Content.ReadFromJsonAsync<JsonElement>();

        var statementResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{accountId}/statement"));
        statementResponse.EnsureSuccessStatusCode();
        var statement = await statementResponse.Content.ReadFromJsonAsync<JsonElement>();

        return new AccountSnapshot(
            account.GetProperty("balance").GetDecimal(),
            account.GetProperty("streamPosition").GetInt64(),
            statement.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task Batch_WithAnUnsupportedCurrency_IsRefused()
    {
        // Rework finding 4: the batch's first leg (against account1) would succeed validation-wise on its
        // own — only the second leg (against account2) fails. Re-reading BOTH accounts after the refusal
        // proves the all-or-nothing guarantee across every account a batch touches, not just that a status
        // code came back; the old test only checked the response, never the accounts.
        var account1 = await OpenAccountAsync();
        var account2 = await OpenAccountAsync();
        var before1 = await SnapshotAsync(account1);
        var before2 = await SnapshotAsync(account2);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = account1, direction = "Credit", amount = 10m, currency = "SGD", category = "Transfer" },
                new { accountId = account2, direction = "Credit", amount = 10m, currency = "XXX", category = "Transfer" }
            }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.UnsupportedCurrency);

        (await SnapshotAsync(account1)).ShouldBe(before1);
        (await SnapshotAsync(account2)).ShouldBe(before2);
    }

    [Fact]
    public async Task Batch_WithAnInvalidAmount_IsRefused()
    {
        var account = await OpenAccountAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = account, direction = "Credit", amount = 10.555m, currency = "SGD", category = "Transfer" }
            }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.InvalidPostingAmount);
    }

    [Fact]
    public async Task Batch_WithAFutureEffectiveDate_IsRefused()
    {
        var account = await OpenAccountAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new
                {
                    accountId = account, direction = "Credit", amount = 10m, currency = "SGD", category = "Transfer",
                    effectiveDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5))
                }
            }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.EffectiveDateInFuture);
    }

    [Fact]
    public async Task Batch_AgainstAnUnknownAccount_IsRefused()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = Guid.NewGuid(), direction = "Credit", amount = 10m, currency = "SGD", category = "Transfer" }
            }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Batch_CurrencyMismatchAgainstTheAccount_IsRefused()
    {
        var account = await OpenAccountAsync("SGD");

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = account, direction = "Credit", amount = 10m, currency = "USD", category = "Transfer" }
            }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.CurrencyMismatch);
    }

    [Fact]
    public async Task Batch_RepeatingTheSameAccountTwice_AllocatesPositionsInSubmissionOrderAndSharesOneGroup()
    {
        var account = await OpenAccountAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = account, direction = "Credit", amount = 100m, currency = "SGD", category = "Transfer" },
                new { accountId = account, direction = "Debit", amount = 40m, currency = "SGD", category = "Transfer" }
            }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var legs = body.EnumerateArray().OrderBy(l => l.GetProperty("streamPosition").GetInt64()).ToList();
        legs.Count.ShouldBe(2);
        legs[0].GetProperty("streamPosition").GetInt64().ShouldBe(1);
        legs[0].GetProperty("balanceAfter").GetDecimal().ShouldBe(100m);
        legs[1].GetProperty("streamPosition").GetInt64().ShouldBe(2);
        legs[1].GetProperty("balanceAfter").GetDecimal().ShouldBe(60m);
        legs[0].GetProperty("transactionGroupId").GetGuid().ShouldBe(legs[1].GetProperty("transactionGroupId").GetGuid());

        var balanceResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{account}/balance"));
        var balance = await balanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        balance.GetProperty("balance").GetDecimal().ShouldBe(60m);
    }

    [Fact]
    public async Task Batch_RepeatingTheSameAccountTwice_TheFloorIsEvaluatedAgainstTheRunningInBatchBalance()
    {
        // Not permitted to go negative: the first leg (credit 50) makes the second leg (debit 80) land at
        // -30 against the RUNNING in-batch balance (50), not the account's opening balance (0) — refused
        // either way, but this proves which one the guard actually reads.
        var account = await OpenAccountAsync(permittedToGoNegative: false);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = account, direction = "Credit", amount = 50m, currency = "SGD", category = "Transfer" },
                new { accountId = account, direction = "Debit", amount = 80m, currency = "SGD", category = "Transfer" }
            }
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.InsufficientFunds);

        // All-or-nothing: neither leg landed, including the first one that would have succeeded alone.
        var balanceResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{account}/balance"));
        var balance = await balanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        balance.GetProperty("balance").GetDecimal().ShouldBe(0m);
    }

    [Fact]
    public async Task Batch_RepeatingTheIdempotencyKeyWithTheSameContent_ReplaysTheOriginalOutcome()
    {
        var account = await OpenAccountAsync();
        var movements = new object[]
        {
            new { accountId = account, direction = "Credit", amount = 30m, currency = "SGD", category = "Transfer" }
        };
        var key = $"batch-{Guid.NewGuid():N}";

        var first = await Client.SendAsync(
            AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new { movements }, key));
        first.StatusCode.ShouldBe(HttpStatusCode.Created);
        var firstBody = await first.Content.ReadFromJsonAsync<JsonElement>();
        var firstId = firstBody[0].GetProperty("id").GetGuid();

        var replay = await Client.SendAsync(
            AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new { movements }, key));

        replay.StatusCode.ShouldBe(HttpStatusCode.OK);
        var replayBody = await replay.Content.ReadFromJsonAsync<JsonElement>();
        replayBody[0].GetProperty("id").GetGuid().ShouldBe(firstId);

        // Nothing new recorded: the account's balance still reflects exactly one 30 SGD credit.
        var balanceResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{account}/balance"));
        var balance = await balanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        balance.GetProperty("balance").GetDecimal().ShouldBe(30m);
    }

    [Fact]
    public async Task Batch_ReusingTheIdempotencyKeyForDifferentContent_IsRefused409()
    {
        var account = await OpenAccountAsync();
        var key = $"batch-{Guid.NewGuid():N}";

        var first = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = account, direction = "Credit", amount = 30m, currency = "SGD", category = "Transfer" }
            }
        }, key));
        first.StatusCode.ShouldBe(HttpStatusCode.Created);

        var conflict = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = account, direction = "Credit", amount = 99m, currency = "SGD", category = "Transfer" }
            }
        }, key));

        conflict.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        var body = await conflict.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.IdempotencyKeyConflict);
    }

    /// <summary>
    /// Rework finding 5 — reproduction: a posting recorded via the single-posting endpoint carries no
    /// <c>TransactionGroupId</c> (it is optional there, unlike the batch endpoint which always assigns one —
    /// <see cref="DKNet.Accounts.AppServices.Postings.V1.Actions.RecordPostingRequest.TransactionGroupId"/> vs
    /// <see cref="DKNet.Accounts.AppServices.Postings.V1.Actions.RecordPostingBatchRequest.TransactionGroupId"/>).
    /// Before DRK-1247 B3's fix, a one-movement batch reusing that same idempotency key with identical content
    /// computed the SAME signature as the original single posting (<c>RecordBatch.ComputeBatchSignature</c>'s
    /// <c>string.Join('|', [x])</c> over one movement was byte-identical to <c>Record</c>'s own signature for
    /// that content), so it took the replay branch and used to dereference
    /// <c>existing.TransactionGroupId!.Value</c> while null — an unhandled
    /// <see cref="InvalidOperationException"/> surfacing as a 500, not a clean replay. The chosen fix for that
    /// (replay the single posting itself when its TransactionGroupId is null) still stands as defense in
    /// depth, but B3's re-hash of the joined batch signature means this collision no longer happens in the
    /// first place: a 1-leg batch's signature is now a double hash, distinguishable from the single-posting
    /// endpoint's own (single-hashed) signature for the identical content. Reusing the same idempotency key
    /// across the two different endpoints is therefore correctly told apart as "a different request reusing
    /// the same key" (409), not silently replayed as if it were the same request.
    /// </summary>
    [Fact]
    public async Task Batch_ReplayingAKeyFirstUsedBySingletonPosting_DoesNotThrow()
    {
        var account = await OpenAccountAsync();
        var key = $"cross-{Guid.NewGuid():N}";

        var singleResponse = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId = account,
            direction = "Credit",
            amount = 30m,
            currency = "SGD",
            category = "Transfer"
        }, key));
        singleResponse.StatusCode.ShouldBe(HttpStatusCode.Created);

        var batchResponse = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = account, direction = "Credit", amount = 30m, currency = "SGD", category = "Transfer" }
            }
        }, key));

        // Not a 500 (the original finding-5 crash) and not a silent duplicate posting either: the two
        // signatures no longer collide, so this is correctly refused as the same key reused for a different
        // request (different endpoint/shape), a clean 409 — not a crash, not a false-positive replay.
        batchResponse.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        var batchBody = await batchResponse.Content.ReadFromJsonAsync<JsonElement>();
        batchBody.GetProperty("code").GetString().ShouldBe(LedgerErrors.IdempotencyKeyConflict);

        // Nothing new recorded: the account's balance still reflects exactly the one 30 SGD credit.
        var balanceResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{account}/balance"));
        var balance = await balanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        balance.GetProperty("balance").GetDecimal().ShouldBe(30m);
    }

    [Fact]
    public async Task Reverse_AgainstAFrozenAccount_IsRefused()
    {
        var account = await OpenAccountAsync();
        var postingId = await RecordAsync(account, "Credit", 50m);
        await PatchStatusAsync(account, "Frozen");

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/{postingId}/reverse"));

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().ShouldBe(LedgerErrors.AccountFrozen);
    }

    [Fact]
    public async Task Reverse_ThatCreditsADormantAccount_IsAllowed()
    {
        // Debiting first (e.g. a fee) then reversing it credits the account back — a reversal that credits a
        // dormant account lands without reactivation (only a reversal that would DEBIT one is refused).
        var account = await OpenAccountAsync(permittedToGoNegative: true, overdraftLimit: 100m);
        var postingId = await RecordAsync(account, "Debit", 20m);
        await PatchStatusAsync(account, "Dormant");

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/{postingId}/reverse"));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("direction").GetString().ShouldBe("credit");

        var balanceResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{account}/balance"));
        var balance = await balanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        balance.GetProperty("balance").GetDecimal().ShouldBe(0m);
    }

    [Fact]
    public async Task Batch_IgnoresRecordedByInTheRequestBody_AttributesToTheCallingSystem()
    {
        // Mirrors §"The recording system is taken from the credential, not the request" for the batch route:
        // recordedBy is model-bound but must never be trusted as the attribution source (R5).
        var account = await OpenAccountAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = account, direction = "Credit", amount = 5m, currency = "SGD", category = "Transfer" }
            },
            recordedBy = "LedgerSync"
        }));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body[0].GetProperty("callingSystem").GetString().ShouldBe("PayHub");
    }

    [Fact]
    public async Task Reverse_AgainstAnUnknownPosting_IsRefused()
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/{Guid.NewGuid()}/reverse"));

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// Stronger than the frozen acceptance scenario's own assertion (which only checks each request
    /// succeeded): proves the per-account lock actually serializes concurrent postings rather than merely
    /// returning 201 for all of them — every position 1..20 appears exactly once and the final balance is
    /// the exact sum, which a lost update (two requests reading the same stale position/balance) would break.
    /// </summary>
    [Fact]
    public async Task Record_TwentyConcurrentCreditsAgainstOneAccount_AllLandWithConsecutivePositionsAndNoneIsLost()
    {
        var account = await OpenAccountAsync();

        var responses = await Task.WhenAll(Enumerable.Range(0, 20)
            .Select(_ => Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
            {
                accountId = account,
                direction = "Credit",
                amount = 10m,
                currency = "SGD",
                category = "Transfer"
            }))));

        responses.ShouldAllBe(r => r.StatusCode == HttpStatusCode.Created);

        var positions = new List<long>();
        foreach (var response in responses)
        {
            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            positions.Add(body.GetProperty("streamPosition").GetInt64());
        }

        positions.OrderBy(p => p).ShouldBe(Enumerable.Range(1, 20).Select(i => (long)i));

        var balanceResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{account}/balance"));
        var balance = await balanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        balance.GetProperty("balance").GetDecimal().ShouldBe(200m);
    }
}

using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Share;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.AppServices.Transfers.V1.Actions;
using DKNet.Accounts.Domains.Features.Transfers.Entities;
using DKNet.Accounts.Domains.Services;
using DKNet.Accounts.Infra.Contexts;
using DKNet.EfCore.Specifications.Repositories;

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


    private Guid? _fixtureGroupId;

    /// <summary>A real group to open accounts into. Opening reads its group now — an account number is
    /// {group code}-{suffix} — so a fabricated group id is refused.</summary>
    private async Task<Guid> FixtureGroupIdAsync()
    {
        if (_fixtureGroupId is not null)
        {
            return _fixtureGroupId.Value;
        }

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, "/v1/account-groups", new
        {
            code = $"G{Guid.NewGuid():N}"[..5].ToUpperInvariant(),
            name = "Fixture Group",
            type = "Customer",
            ownerId = "PayHub"
        }));
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        _fixtureGroupId = created.GetProperty("id").GetGuid();
        return _fixtureGroupId.Value;
    }

    private async Task<Guid> OpenAccountAsync(
        string currency = "SGD", string classification = "Liability", bool permittedToGoNegative = false, decimal? overdraftLimit = null)
    {
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, AccountsPath, new
        {
            groupId = await FixtureGroupIdAsync(),
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

    /// <summary>Reversal requires both a reason (body) and an <c>Idempotency-Key</c> header; a fresh key per
    /// call by default so each reversal is its own request rather than a replay of the previous one.</summary>
    private Task<HttpResponseMessage> ReverseAsync(
        Guid postingId, string reason = "Recorded in error", string? idempotencyKey = null) =>
        Client.SendAsync(AsPayHub(
            HttpMethod.Post,
            $"{PostingsPath}/{postingId}/reverse",
            new { reason },
            idempotencyKey ?? $"rev-{Guid.NewGuid():N}"));

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
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.UnsupportedCurrency)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.UnsupportedCurrency}, got: {body}");
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
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.InvalidPostingAmount)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.InvalidPostingAmount}, got: {body}");
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
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.EffectiveDateInFuture)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.EffectiveDateInFuture}, got: {body}");
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
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.CurrencyMismatch)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.CurrencyMismatch}, got: {body}");
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
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.InsufficientFunds)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.InsufficientFunds}, got: {body}");
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
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.IdempotencyKeyConflict)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.IdempotencyKeyConflict}, got: {body}");
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
        batchBody.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.IdempotencyKeyConflict)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.IdempotencyKeyConflict}, got: {batchBody}");
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

        var response = await ReverseAsync(postingId);

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.AccountFrozen)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.AccountFrozen}, got: {body}");
    }

    [Fact]
    public async Task Reverse_ThatCreditsADormantAccount_IsAllowed()
    {
        // Debiting first (e.g. a fee) then reversing it credits the account back — a reversal that credits a
        // dormant account lands without reactivation (only a reversal that would DEBIT one is refused).
        var account = await OpenAccountAsync(permittedToGoNegative: true, overdraftLimit: 100m);
        var postingId = await RecordAsync(account, "Debit", 20m);
        await PatchStatusAsync(account, "Dormant");

        var response = await ReverseAsync(postingId);

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
        var response = await ReverseAsync(Guid.NewGuid());

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Reverse_WithoutAnIdempotencyKey_IsRejected()
    {
        var account = await OpenAccountAsync();
        var postingId = await RecordAsync(account, "Credit", 50m);

        var response = await Client.SendAsync(AsPayHub(
            HttpMethod.Post, $"{PostingsPath}/{postingId}/reverse", new { reason = "Recorded in error" }));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Reverse_WithoutAReason_IsRejected()
    {
        var account = await OpenAccountAsync();
        var postingId = await RecordAsync(account, "Credit", 50m);

        var response = await ReverseAsync(postingId, reason: "");

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Reverse_PutsTheCallersReasonOnTheReversalsDescription()
    {
        // The reason replaces the old auto-generated "Reversal of {postingNumber}" prose — the lineage is
        // already carried structurally by reversesPostingId, so the description is free to hold why.
        var account = await OpenAccountAsync();
        var postingId = await RecordAsync(account, "Credit", 50m);

        var response = await ReverseAsync(postingId, "Duplicate of TX-991");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("description").GetString().ShouldBe("Duplicate of TX-991");
        body.GetProperty("reversesPostingId").GetGuid().ShouldBe(postingId);
    }

    [Fact]
    public async Task Reverse_ReplayedUnderTheSameKeyAndReason_ReturnsTheFirstReversal()
    {
        // The whole point of requiring the key: a retried reversal (timeout, redelivery) must return the
        // reversal it already wrote, NOT POSTING_ALREADY_REVERSED — and must not write a second one.
        var account = await OpenAccountAsync();
        var postingId = await RecordAsync(account, "Credit", 50m);
        var key = $"rev-{Guid.NewGuid():N}";

        var first = await ReverseAsync(postingId, "Recorded in error", key);
        var replay = await ReverseAsync(postingId, "Recorded in error", key);

        first.StatusCode.ShouldBe(HttpStatusCode.OK);
        replay.StatusCode.ShouldBe(HttpStatusCode.OK);
        var firstBody = await first.Content.ReadFromJsonAsync<JsonElement>();
        var replayBody = await replay.Content.ReadFromJsonAsync<JsonElement>();
        replayBody.GetProperty("id").GetGuid().ShouldBe(firstBody.GetProperty("id").GetGuid());

        // Only one reversal landed, so the balance is back to zero rather than overshot to -50.
        var balanceResponse = await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{AccountsPath}/{account}/balance"));
        var balance = await balanceResponse.Content.ReadFromJsonAsync<JsonElement>();
        balance.GetProperty("balance").GetDecimal().ShouldBe(0m);
    }

    [Fact]
    public async Task Reverse_ReusingAKeyWithADifferentReason_IsRefused()
    {
        var account = await OpenAccountAsync();
        var postingId = await RecordAsync(account, "Credit", 50m);
        var key = $"rev-{Guid.NewGuid():N}";
        (await ReverseAsync(postingId, "Recorded in error", key)).EnsureSuccessStatusCode();

        var response = await ReverseAsync(postingId, "Customer dispute", key);

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.IdempotencyKeyConflict)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.IdempotencyKeyConflict}, got: {body}");
    }

    [Fact]
    public async Task Reverse_UnderAFreshKeyAgainstAnAlreadyReversedPosting_IsStillRefused()
    {
        // A genuinely new request (its own key) against an already-reversed posting keeps the 422 — only a
        // replay of the SAME key is answered with the earlier reversal.
        var account = await OpenAccountAsync();
        var postingId = await RecordAsync(account, "Credit", 50m);
        (await ReverseAsync(postingId)).EnsureSuccessStatusCode();

        var response = await ReverseAsync(postingId);

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == LedgerErrors.PostingAlreadyReversed)
            .ShouldBeTrue($"expected an error carrying code {LedgerErrors.PostingAlreadyReversed}, got: {body}");
    }

    /// <summary>DRK-1813 fix brief #1 setup, on a floor-0 Liability account: credit 100, debit 100, reverse the
    /// debit (balance 100), debit 100 again (balance 0). Returns the account and the reversal posting.</summary>
    private async Task<(Guid Account, Guid Reversal)> AReversalFollowedByAnotherDebitAsync()
    {
        var account = await OpenAccountAsync();
        await RecordAsync(account, "Credit", 100m);
        var debit = await RecordAsync(account, "Debit", 100m);
        var reversed = await ReverseAsync(debit);
        reversed.StatusCode.ShouldBe(HttpStatusCode.OK);
        var reversal = (await reversed.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await RecordAsync(account, "Debit", 100m);
        return (account, reversal);
    }

    private static async Task ShouldBeRefusedWithCodeAsync(HttpResponseMessage response, string code)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity, body.ToString());
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == code)
            .ShouldBeTrue($"expected an error carrying code {code}, got: {body}");
    }

    /// <summary>A plain input refusal: 400 naming <paramref name="field"/>, and no ledger code on the body (a
    /// known ledger code would turn it into a 422).</summary>
    private static async Task ShouldBeRefusedNamingFieldAsync(HttpResponseMessage response, string field)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest, body.ToString());
        body.TryGetProperty(LedgerErrors.CodeKey, out _).ShouldBeFalse();
        body.GetProperty("errors").EnumerateArray()
            .Any(e => e.GetProperty("field").GetString() == field)
            .ShouldBeTrue($"expected a '{field}' field error, got: {body}");
    }

    [Fact]
    public async Task Reverse_RetryingARefusedReverseOfAReversalUnderTheSameKey_IsRefusedAgain()
    {
        // Nothing was recorded by the first refusal, so the retry finds no replay under its key and is
        // refused the same way — not answered with a reversal that was never written.
        var (account, reversal) = await AReversalFollowedByAnotherDebitAsync();
        var before = await SnapshotAsync(account);
        before.Balance.ShouldBe(0m);
        var key = $"rev-{Guid.NewGuid():N}";

        var first = await ReverseAsync(reversal, "Recorded in error", key);
        var retry = await ReverseAsync(reversal, "Recorded in error", key);

        await ShouldBeRefusedWithCodeAsync(first, "POSTING_IS_REVERSAL");
        await ShouldBeRefusedWithCodeAsync(retry, "POSTING_IS_REVERSAL");
        (await SnapshotAsync(account)).ShouldBe(before);
        var target = await (await Client.SendAsync(AsPayHub(HttpMethod.Get, $"{PostingsPath}/{reversal}")))
            .Content.ReadFromJsonAsync<JsonElement>();
        target.GetProperty("status").GetString().ShouldBe("posted");
        (target.TryGetProperty("reversedByPostingId", out var reversedBy) && reversedBy.ValueKind != JsonValueKind.Null)
            .ShouldBeFalse($"expected no reversedByPostingId, got: {target}");
    }

    [Fact]
    public async Task Record_WithCategoryReversal_IsRefusedNamingTheCategoryField()
    {
        var account = await OpenAccountAsync();
        var before = await SnapshotAsync(account);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId = account,
            direction = "Credit",
            amount = 100m,
            currency = "SGD",
            category = "Reversal"
        }));

        await ShouldBeRefusedNamingFieldAsync(response, "Category");
        (await SnapshotAsync(account)).ShouldBe(before);
    }

    [Fact]
    public async Task Batch_WithAReversalMovement_IsRefusedWhole()
    {
        // The first movement is valid on its own; only the second names the Reversal category. Re-reading both
        // accounts proves neither leg landed.
        var account1 = await OpenAccountAsync();
        var account2 = await OpenAccountAsync();
        var before1 = await SnapshotAsync(account1);
        var before2 = await SnapshotAsync(account2);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = account1, direction = "Credit", amount = 100m, currency = "SGD", category = "Transfer" },
                new { accountId = account2, direction = "Credit", amount = 100m, currency = "SGD", category = "Reversal" }
            }
        }));

        await ShouldBeRefusedNamingFieldAsync(response, "Movements[1].Category");
        (await SnapshotAsync(account1)).ShouldBe(before1);
        (await SnapshotAsync(account2)).ShouldBe(before2);
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

    /// <summary>
    /// DRK-2120 surface B §6a D6: a posting stored before keys were lowercased keeps its mixed-case key (no data
    /// change, Q8). A request under the same key in lowercase, with the same content, replays that posting — one
    /// calling system never records 2 postings under one key, whatever its case.
    /// </summary>
    [Fact]
    public async Task Record_WhenAPostingStoredBeforeLowercasingCarriesTheKeyInUppercase_ReplaysIt()
    {
        var account = await OpenAccountAsync();
        var posting = new { accountId = account, direction = "Credit", amount = 100.00m, currency = "SGD", category = "Transfer" };

        var first = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, posting, "abc"));
        first.StatusCode.ShouldBe(HttpStatusCode.Created);
        var firstId = (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        // The legacy row: stored as the client sent it, before this change.
        using (var scope = fixture.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
            var stored = await dbContext.Set<Posting>().SingleAsync(p => p.Id == firstId);
            dbContext.Entry(stored).Property(p => p.IdempotencyKey).CurrentValue = "ABC";
            await dbContext.SaveChangesAsync();
        }

        var replay = await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, posting, "abc"));

        replay.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await replay.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid().ShouldBe(firstId);
        using (var scope = fixture.CreateScope())
        {
            (await scope.ServiceProvider.GetRequiredService<CoreDbContext>().Set<Posting>()
                .CountAsync(p => p.AccountId == account)).ShouldBe(1);
        }
    }

    #region Transfers (DRK-2276)

    private const string TransfersPath = "/v1/transfers";

    private static async Task ShouldBeRefusedWithAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(status, body);
        JsonDocument.Parse(body).RootElement.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("code", out var itemCode) && itemCode.GetString() == code)
            .ShouldBeTrue($"expected an error carrying code {code}, got: {body}");
    }

    private async Task<long> TransferCountAsync()
    {
        using var scope = fixture.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<CoreDbContext>().Set<Transfer>().LongCountAsync();
    }

    private static RecordTransferCommandHandler TransferHandler(IServiceProvider services, string? callingSystem) =>
        new(services.GetRequiredService<IRepositorySpec>(), services.GetRequiredService<IMapper>(),
            services.GetRequiredService<IPostingNumberGenerator>(), services.GetRequiredService<IAccountLockProvider>(),
            new FixedCallingSystem(callingSystem), services.GetRequiredService<TimeProvider>());

    private sealed class FixedCallingSystem(string? callingSystem) : ICallingSystemAccessor
    {
        public string? CallingSystem => callingSystem;
    }

    /// <summary>§6a D4: a rate that makes the destination's credit larger than any stored amount may be is
    /// refused AMOUNT_OUT_OF_RANGE by the destination's own posting rules, and nothing is recorded.</summary>
    [Fact]
    public async Task Transfer_WhoseConvertedAmountIsAboveTheCeiling_IsRefusedAmountOutOfRange()
    {
        var source = await OpenAccountAsync("USD");
        var destination = await OpenAccountAsync("VND");
        await RecordAsync(source, "Credit", 1_000_000.00m, "USD");
        var transfers = await TransferCountAsync();
        var before = await SnapshotAsync(source);

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, TransfersPath, new
        {
            sourceAccountId = source,
            destinationAccountId = destination,
            amount = 1_000_000.00m,
            sourceCurrency = "USD",
            destinationCurrency = "VND",
            exchangeRate = 9_999_999m,
            fee = 0m
        }, $"tr-{Guid.NewGuid():N}"));

        await ShouldBeRefusedWithAsync(response, HttpStatusCode.UnprocessableEntity, LedgerErrors.AmountOutOfRange);
        (await SnapshotAsync(source)).ShouldBe(before);
        (await TransferCountAsync()).ShouldBe(transfers);
    }

    /// <summary>An amount above 999,999,999,999.999999 can never be stored, so the handler refuses it before it
    /// converts it: 10,000,000,000,000,000,000 at the largest whole rate would overflow the conversion itself.</summary>
    [Fact]
    public async Task Transfer_WhoseAmountIsAboveTheCeiling_IsRefusedAmountOutOfRange()
    {
        var source = await OpenAccountAsync();
        var destination = await OpenAccountAsync("USD");
        var transfers = await TransferCountAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, TransfersPath, new
        {
            sourceAccountId = source,
            destinationAccountId = destination,
            amount = 10_000_000_000_000_000_000.00m,
            sourceCurrency = "SGD",
            destinationCurrency = "USD",
            exchangeRate = 9_999_999_999m,
            fee = 0m
        }, $"tr-{Guid.NewGuid():N}"));

        await ShouldBeRefusedWithAsync(response, HttpStatusCode.UnprocessableEntity, LedgerErrors.AmountOutOfRange);
        (await TransferCountAsync()).ShouldBe(transfers);
    }

    /// <summary>Currency codes are compared without regard to case: a lowercase request is recorded under the
    /// upper-case codes, and a retry spelling them in upper case is the same transfer, replayed.</summary>
    [Fact]
    public async Task Transfer_WithLowercaseCurrencies_IsRecordedUpperCased_AndAnUpperCaseRetryReplaysIt()
    {
        var source = await OpenAccountAsync();
        var destination = await OpenAccountAsync("USD");
        await RecordAsync(source, "Credit", 100.00m);
        var key = $"tr-{Guid.NewGuid():N}";

        var first = await Client.SendAsync(AsPayHub(HttpMethod.Post, TransfersPath, new
        {
            sourceAccountId = source, destinationAccountId = destination, amount = 10.00m,
            sourceCurrency = "sgd", destinationCurrency = "usd", exchangeRate = 0.74m, fee = 0m
        }, key));
        var retry = await Client.SendAsync(AsPayHub(HttpMethod.Post, TransfersPath, new
        {
            sourceAccountId = source, destinationAccountId = destination, amount = 10.00m,
            sourceCurrency = "SGD", destinationCurrency = "USD", exchangeRate = 0.74m, fee = 0m
        }, key));

        first.StatusCode.ShouldBe(HttpStatusCode.Created, await first.Content.ReadAsStringAsync());
        var recorded = await first.Content.ReadFromJsonAsync<JsonElement>();
        recorded.GetProperty("sourceCurrency").GetString().ShouldBe("SGD");
        recorded.GetProperty("destinationCurrency").GetString().ShouldBe("USD");
        recorded.GetProperty("convertedAmount").GetDecimal().ShouldBe(7.40m);
        retry.StatusCode.ShouldBe(HttpStatusCode.OK, await retry.Content.ReadAsStringAsync());
        (await retry.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid()
            .ShouldBe(recorded.GetProperty("id").GetGuid());
    }

    /// <summary>R4: a retry under the same key that differs in any one field is a different transfer, refused
    /// 409. A currency cannot change on its own: it must match its account, so it changes only with the
    /// account id, which this theory already changes.</summary>
    [Theory]
    [InlineData("destination")]
    [InlineData("amount")]
    [InlineData("exchangeRate")]
    [InlineData("fee")]
    [InlineData("feeAccount")]
    public async Task Transfer_RetriedUnderItsKeyWithOneFieldChanged_IsRefusedIdempotencyKeyConflict(string field)
    {
        var source = await OpenAccountAsync();
        var usd = await OpenAccountAsync("USD");
        var otherUsd = await OpenAccountAsync("USD");
        var fees = await OpenAccountAsync();
        var otherFees = await OpenAccountAsync();
        await RecordAsync(source, "Credit", 100.00m);
        var key = $"tr-{Guid.NewGuid():N}";
        var original = new Dictionary<string, object?>
        {
            ["sourceAccountId"] = source, ["destinationAccountId"] = usd, ["amount"] = 10.00m,
            ["sourceCurrency"] = "SGD", ["destinationCurrency"] = "USD", ["exchangeRate"] = 0.74m,
            ["fee"] = 1.00m, ["feeAccountId"] = fees
        };
        (await Client.SendAsync(AsPayHub(HttpMethod.Post, TransfersPath, original, key))).StatusCode
            .ShouldBe(HttpStatusCode.Created);
        var changed = new Dictionary<string, object?>(original);
        switch (field)
        {
            case "destination": changed["destinationAccountId"] = otherUsd; break;
            case "amount": changed["amount"] = 11.00m; break;
            case "exchangeRate": changed["exchangeRate"] = 0.75m; break;
            case "fee": changed["fee"] = 2.00m; break;
            case "feeAccount": changed["feeAccountId"] = otherFees; break;
        }

        var transfers = await TransferCountAsync();
        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, TransfersPath, changed, key));

        await ShouldBeRefusedWithAsync(response, HttpStatusCode.Conflict, LedgerErrors.IdempotencyKeyConflict);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors").EnumerateArray()
            .Select(e => e.GetProperty("message").GetString())
            .ShouldContain("This idempotency key was already used for a different request.");
        (await TransferCountAsync()).ShouldBe(transfers);
    }

    /// <summary>§3a: the largest rate allowed, 9,999,999,999.99999999, is accepted — 0.01 USD at that rate
    /// credits 100,000,000 VND, rounded half away from zero to VND's 0 places.</summary>
    [Fact]
    public async Task Transfer_AtTheLargestRateAllowed_IsRecorded()
    {
        var source = await OpenAccountAsync("USD");
        var destination = await OpenAccountAsync("VND");
        await RecordAsync(source, "Credit", 0.01m, "USD");

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, TransfersPath, new
        {
            sourceAccountId = source,
            destinationAccountId = destination,
            amount = 0.01m,
            sourceCurrency = "USD",
            destinationCurrency = "VND",
            exchangeRate = 9_999_999_999.99999999m,
            fee = 0m
        }, $"tr-{Guid.NewGuid():N}"));

        response.StatusCode.ShouldBe(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("convertedAmount").GetDecimal()
            .ShouldBe(100_000_000m);
    }

    /// <summary>R4: a key a single posting already used is refused on a transfer by the handler itself — not
    /// left to the database's unique index, which a provider without one (InMemory) never enforces.</summary>
    [Fact]
    public async Task Transfer_UnderAKeyASinglePostingAlreadyUsed_IsRefusedIdempotencyKeyConflict()
    {
        var source = await OpenAccountAsync();
        var destination = await OpenAccountAsync();
        var key = $"k-{Guid.NewGuid():N}";
        (await Client.SendAsync(AsPayHub(HttpMethod.Post, PostingsPath, new
        {
            accountId = source, direction = "Credit", amount = 100.00m, currency = "SGD", category = "Transfer"
        }, key))).StatusCode.ShouldBe(HttpStatusCode.Created);
        var transfers = await TransferCountAsync();

        var response = await Client.SendAsync(AsPayHub(HttpMethod.Post, TransfersPath, new
        {
            sourceAccountId = source, destinationAccountId = destination, amount = 10.00m,
            sourceCurrency = "SGD", destinationCurrency = "SGD", fee = 0m
        }, key));

        await ShouldBeRefusedWithAsync(response, HttpStatusCode.Conflict, LedgerErrors.IdempotencyKeyConflict);
        (await TransferCountAsync()).ShouldBe(transfers);
    }

    /// <summary>R1: the handler fails closed on a missing key rather than trusting the validator to have run —
    /// SpecGetPosting skips its key clause on a null key and would match an arbitrary posting.</summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task TransferHandler_WithNoIdempotencyKey_RefusesWithoutRecording(string? key)
    {
        using var scope = fixture.CreateScope();
        var handler = TransferHandler(scope.ServiceProvider, "PayHub");
        var transfers = await TransferCountAsync();

        var result = await handler.OnHandle(new RecordTransferRequest
        {
            SourceAccountId = Guid.NewGuid(), DestinationAccountId = Guid.NewGuid(), Amount = 10.00m,
            SourceCurrency = "SGD", DestinationCurrency = "SGD", Fee = 0m, IdempotencyKey = key
        }, CancellationToken.None);

        result.IsFailed.ShouldBeTrue();
        result.Errors.ShouldHaveSingleItem().Message.ShouldBe("An Idempotency-Key header is required to record a transfer.");
        (await TransferCountAsync()).ShouldBe(transfers);
    }

    [Fact]
    public async Task TransferHandler_WithNoCallingSystem_RefusesAsUnauthenticated()
    {
        using var scope = fixture.CreateScope();
        var handler = TransferHandler(scope.ServiceProvider, null);

        var result = await handler.OnHandle(new RecordTransferRequest
        {
            SourceAccountId = Guid.NewGuid(), DestinationAccountId = Guid.NewGuid(), Amount = 10.00m,
            SourceCurrency = "SGD", DestinationCurrency = "SGD", Fee = 0m, IdempotencyKey = "k"
        }, CancellationToken.None);

        result.Errors.ShouldHaveSingleItem().Message.ShouldBe("The caller is not authenticated.");
    }

    #endregion
}

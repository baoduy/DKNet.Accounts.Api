using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-1535 §5 (Dknet12IdempotencyHeader.feature) — the move to DKNet 12.0.0's
/// <c>[FromRequestHeader]</c> as the idempotency key's declared source (§3 rows 3-5). Every scenario here is
/// tagged <c>@guard</c>: the idempotency semantics themselves do not change (§6 rule "you are changing where
/// the value arrives from, nothing else"), so each one already passes on today's hand-written
/// <c>http.Headers["Idempotency-Key"]</c> read and pins that behaviour through the Build stage's switch to
/// the declared header source.
/// </summary>
[Binding]
public sealed class Dknet12IdempotencyHeaderSteps(HttpClient client, ScenarioState state)
{
    private const string PostingsPath = "/v1/postings";

    #region Shared helpers

    private Guid Account(string name) => Guid.Parse(state.Values[$"account:{name}"]);

    private static async Task<Guid?> TryReadIdAsync(HttpResponseMessage response)
    {
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var doc = await response.Content.ReadFromJsonAsync<JsonElement>();
        return doc.TryGetProperty("id", out var idProp) && idProp.TryGetGuid(out var id) ? id : null;
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(text);
    }

    #endregion

    #region Given

    [Given(@"a batch moving ([\d.]+) SGD from ""([^""]+)"" to ""([^""]+)"" was recorded with the idempotency key ""([^""]+)""")]
    public async Task GivenABatchMovingFromToWasRecordedWithTheIdempotencyKey(
        decimal amount, string fromName, string toName, string idempotencyKey)
    {
        state.CallerClientId = "treasury-ops";
        state.CallerScopes = [ScopeNames.AccountsWrite, ScopeNames.PostingsWrite];

        var groupResponse = await client.SendAsCallerAsync(state, HttpMethod.Post, "/v1/account-groups", new
        {
            code = $"grp-{Guid.NewGuid():N}", name = $"group-for-{fromName}-{toName}", type = "Customer",
            ownerId = state.CallerClientId
        });
        var groupId = (await TryReadIdAsync(groupResponse))!.Value;

        var fromResponse = await client.SendAsCallerAsync(state, HttpMethod.Post, "/v1/accounts", new
        {
            groupId, name = fromName, currency = "SGD", classification = "Liability"
        });
        var fromId = (await TryReadIdAsync(fromResponse))!.Value;
        state.Values[$"account:{fromName}"] = fromId.ToString();

        var toResponse = await client.SendAsCallerAsync(state, HttpMethod.Post, "/v1/accounts", new
        {
            groupId, name = toName, currency = "SGD", classification = "Liability"
        });
        var toId = (await TryReadIdAsync(toResponse))!.Value;
        state.Values[$"account:{toName}"] = toId.ToString();

        // Seeds the "from" account so the debit leg below has funds to move.
        await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId = fromId, direction = "Credit", amount = 100.00m, currency = "SGD", category = "Transfer"
        });

        await client.SendAsCallerAsync(state, HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = fromId, direction = "Debit", amount, currency = "SGD", category = "Transfer" },
                new { accountId = toId, direction = "Credit", amount, currency = "SGD", category = "Transfer" }
            }
        }, idempotencyKey);
    }

    #endregion

    #region When

    [When(@"""[^""]+"" records a posting against ""([^""]+)"" with a fresh idempotency key")]
    public async Task WhenRecordsAPostingAgainstWithAFreshIdempotencyKey(string accountName)
    {
        var key = $"fresh-{Guid.NewGuid():N}";
        state.Values["sentIdempotencyKey"] = key;
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId = Account(accountName), direction = "Credit", amount = 10.00m, currency = "SGD", category = "Transfer"
        }, key);
    }

    [When(@"""[^""]+"" records a batch moving ([\d.]+) SGD from ""([^""]+)"" to ""([^""]+)"" with a fresh batch idempotency key")]
    public async Task WhenRecordsABatchMovingFromToWithAFreshBatchIdempotencyKey(
        decimal amount, string fromName, string toName)
    {
        var key = $"fresh-batch-{Guid.NewGuid():N}";
        state.Values["sentIdempotencyKey"] = key;
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = Account(fromName), direction = "Debit", amount, currency = "SGD", category = "Transfer" },
                new { accountId = Account(toName), direction = "Credit", amount, currency = "SGD", category = "Transfer" }
            }
        }, key);
    }

    [When(@"""[^""]+"" sends a different batch moving ([\d.]+) SGD from ""([^""]+)"" to ""([^""]+)"" with the idempotency key ""([^""]+)""")]
    public async Task WhenSendsADifferentBatchMovingFromToWithTheIdempotencyKey(
        decimal amount, string fromName, string toName, string idempotencyKey) =>
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, $"{PostingsPath}/batch", new
        {
            movements = new object[]
            {
                new { accountId = Account(fromName), direction = "Debit", amount, currency = "SGD", category = "Transfer" },
                new { accountId = Account(toName), direction = "Credit", amount, currency = "SGD", category = "Transfer" }
            }
        }, idempotencyKey);

    /// <summary>Sends <c>idempotencyKey</c> as a body field, deliberately with no <c>Idempotency-Key</c>
    /// header — proves a body-supplied value never takes effect (§3 rows 3-4, R3).</summary>
    [When(@"""[^""]+"" records a posting against ""([^""]+)"" carrying the idempotency key ""([^""]+)"" only in the body")]
    public async Task WhenRecordsAPostingCarryingTheIdempotencyKeyOnlyInTheBody(string accountName, string idempotencyKey)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId = Account(accountName), direction = "Credit", amount = 5.00m, currency = "SGD",
            category = "Transfer", idempotencyKey
        });
        state.Response = response;
        state.Values["firstBodyOnlyKeyResponseId"] = (await TryReadIdAsync(response))?.ToString() ?? "";
    }

    [When(@"""[^""]+"" records the same posting payload against ""([^""]+)"" carrying the idempotency key ""([^""]+)"" only in the body again")]
    public async Task WhenRecordsTheSamePostingPayloadAgainCarryingTheIdempotencyKeyOnlyInTheBody(
        string accountName, string idempotencyKey)
    {
        var response = await client.SendAsCallerAsync(state, HttpMethod.Post, PostingsPath, new
        {
            accountId = Account(accountName), direction = "Credit", amount = 5.00m, currency = "SGD",
            category = "Transfer", idempotencyKey
        });
        state.Response = response;
        state.Values["secondBodyOnlyKeyResponseId"] = (await TryReadIdAsync(response))?.ToString() ?? "";
    }

    #endregion

    #region Then

    [Then(@"the recorded posting carries the idempotency key it was sent")]
    public async Task ThenTheRecordedPostingCarriesTheIdempotencyKeyItWasSent()
    {
        var doc = await ReadJsonAsync(state.Response!);
        doc.GetProperty("idempotencyKey").GetString().ShouldBe(state.Values["sentIdempotencyKey"]);
    }

    [Then(@"the first leg of the batch carries the idempotency key it was sent")]
    public async Task ThenTheFirstLegOfTheBatchCarriesTheIdempotencyKeyItWasSent()
    {
        var doc = await ReadJsonAsync(state.Response!);
        var firstLeg = doc.EnumerateArray().First();
        firstLeg.GetProperty("idempotencyKey").GetString().ShouldBe(state.Values["sentIdempotencyKey"]);
    }

    [Then(@"both requests are recorded as separate postings")]
    public void ThenBothRequestsAreRecordedAsSeparatePostings()
    {
        var first = state.Values.GetValueOrDefault("firstBodyOnlyKeyResponseId");
        var second = state.Values.GetValueOrDefault("secondBodyOnlyKeyResponseId");
        first.ShouldNotBeNullOrEmpty();
        second.ShouldNotBeNullOrEmpty();
        first.ShouldNotBe(second);
    }

    #endregion
}

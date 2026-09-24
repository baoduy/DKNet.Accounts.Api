using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using DKNet.Accounts.Client;
using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>
/// Build-stage unit coverage for the 20-odd <see cref="IAccountClient"/> methods no DRK-1638 §5 acceptance
/// scenario happens to exercise (most of them touch only a handful directly, e.g. list/create/record) — this
/// class is not part of the frozen acceptance-test set and adds no new scenario semantics, it only proves
/// each remaining method builds the right request and maps the response back, over the same
/// <see cref="RecordingHandler"/> stub the frozen suite already uses.
/// </summary>
public sealed class AccountClientUnitTests
{
    private static readonly Uri ServiceAddress = new("https://accounts.example.test");

    private static AccountClient ClientFor(RecordingHandler handler)
    {
        var httpClient = new HttpClient(handler) { BaseAddress = ServiceAddress };
        return new AccountClient(httpClient);
    }

    private const string GroupJson =
        """{"id":"11111111-1111-1111-1111-111111111111","code":"CUST1","name":"Group","type":"customer","status":"active","ownerId":"PayHub"}""";

    private const string AccountJson =
        """{"id":"22222222-2222-2222-2222-222222222222","groupId":"11111111-1111-1111-1111-111111111111","accountNumber":"ACC0001","name":"Operating","currency":"SGD","classification":"asset","status":"active","availableBalance":0,"openedOn":"2026-01-01T00:00:00Z"}""";

    private const string CurrencyJson =
        """{"id":"33333333-3333-3333-3333-333333333333","code":"SGD","name":"Singapore Dollar","decimalPlaces":2,"isActive":true}""";

    private const string PostingJson =
        """{"id":"44444444-4444-4444-4444-444444444444","accountId":"22222222-2222-2222-2222-222222222222","postingNumber":"1","direction":"credit","currency":"SGD","signedAmount":10.0}""";

    [Fact]
    public async Task GetAccountGroupAsync_ReadsOneGroupById()
    {
        var handler = new RecordingHandler { ResponseBody = GroupJson };
        var client = ClientFor(handler);

        var group = await client.GetAccountGroupAsync(Guid.Parse("11111111-1111-1111-1111-111111111111"));

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Get);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldBe("/v1/account-groups/11111111-1111-1111-1111-111111111111");
        group.Code.ShouldBe("CUST1");
    }

    [Fact]
    public async Task GetAccountGroupsAsync_BuildsFilterSearchOrderAndPagingQueryString()
    {
        var handler = new RecordingHandler
        {
            ResponseBody = """{"items":[],"pageCount":0,"pageNumber":1,"pageSize":10,"totalItemCount":0,"hasNextPage":false,"hasPreviousPage":false}"""
        };
        var client = ClientFor(handler);

        await client.GetAccountGroupsAsync(new AccountGroupsListQuery
        {
            Filters = [new ListFilter("Type", "Equal", "Customer")],
            Search = "treasury",
            OrderBy = "Name",
            Desc = true,
            PageNumber = 2,
            PageSize = 10,
            FromDate = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
            ToDate = new DateTimeOffset(2026, 2, 1, 0, 0, 0, TimeSpan.Zero)
        });

        var query = handler.LastRequest!.RequestUri!.Query;
        query.ShouldContain("filter=Type%3AEqual%3ACustomer");
        query.ShouldContain("search=treasury");
        query.ShouldContain("orderBy=Name");
        query.ShouldContain("desc=true");
        query.ShouldContain("pageNumber=2");
        query.ShouldContain("pageSize=10");
        query.ShouldContain("fromDate=");
        query.ShouldContain("toDate=");
    }

    [Fact]
    public async Task UpdateAccountGroupAsync_SendsPutWithName()
    {
        var handler = new RecordingHandler { ResponseBody = GroupJson };
        var client = ClientFor(handler);

        await client.UpdateAccountGroupAsync(Guid.Parse("11111111-1111-1111-1111-111111111111"), "New Name");

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Put);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldBe("/v1/account-groups/11111111-1111-1111-1111-111111111111");
        var body = await handler.LastRequest.Content!.ReadAsStringAsync();
        body.ShouldContain("\"name\":\"New Name\"");
    }

    [Fact]
    public async Task UpdateAccountGroupAsync_SendsEveryMemberSupplied()
    {
        var handler = new RecordingHandler { ResponseBody = GroupJson };
        var client = ClientFor(handler);

        await client.UpdateAccountGroupAsync(
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            description: "A group",
            metadata: new Dictionary<string, string> { ["region"] = "SG" });

        var body = await handler.LastRequest!.Content!.ReadAsStringAsync();
        body.ShouldContain("\"description\":\"A group\"");
        body.ShouldContain("\"region\":\"SG\"");
        // An omitted member goes over the wire as null — the server reads that as "leave it alone".
        body.ShouldContain("\"name\":null");
    }

    [Fact]
    public async Task CloseAccountGroupAsync_SendsPostToCloseRoute()
    {
        var handler = new RecordingHandler { ResponseBody = GroupJson };
        var client = ClientFor(handler);

        await client.CloseAccountGroupAsync(Guid.Parse("11111111-1111-1111-1111-111111111111"));

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Post);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldEndWith("/close");
    }

    [Fact]
    public async Task ActivateAccountGroupAsync_SendsPostToActivateRoute()
    {
        var handler = new RecordingHandler { ResponseBody = GroupJson };
        var client = ClientFor(handler);

        await client.ActivateAccountGroupAsync(Guid.Parse("11111111-1111-1111-1111-111111111111"));

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Post);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldEndWith("/activate");
    }

    [Fact]
    public async Task DeleteAccountGroupAsync_SendsDelete()
    {
        var handler = new RecordingHandler();
        var client = ClientFor(handler);

        await client.DeleteAccountGroupAsync(Guid.Parse("11111111-1111-1111-1111-111111111111"));

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Delete);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldBe("/v1/account-groups/11111111-1111-1111-1111-111111111111");
    }

    [Fact]
    public async Task GetAccountGroupBalancesAsync_ReadsBalanceLines()
    {
        var handler = new RecordingHandler { ResponseBody = """[{"currency":"SGD","balance":10.0}]""" };
        var client = ClientFor(handler);

        var balances = await client.GetAccountGroupBalancesAsync(Guid.Parse("11111111-1111-1111-1111-111111111111"));

        handler.LastRequest!.RequestUri!.AbsolutePath.ShouldEndWith("/balances");
        balances.Single().Currency.ShouldBe("SGD");
    }

    [Fact]
    public async Task GetAccountGroupStatusCountsAsync_BuildsFromToQueryStringAndReadsCounts()
    {
        var handler = new RecordingHandler
        {
            ResponseBody = """[{"type":"AccountGroupStatus","status":"ACTIVE","count":2}]"""
        };
        var client = ClientFor(handler);

        var counts = await client.GetAccountGroupStatusCountsAsync(
            new DateTimeOffset(2026, 9, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 9, 30, 23, 59, 59, TimeSpan.Zero));

        handler.LastRequest!.RequestUri!.AbsolutePath.ShouldEndWith("/account-groups/status-counts");
        var query = handler.LastRequest.RequestUri.Query;
        query.ShouldContain("from=");
        query.ShouldContain("to=");
        counts.Single().Status.ShouldBe("ACTIVE");
    }

    [Fact]
    public async Task GetAccountAsync_ReadsOneAccountById()
    {
        var handler = new RecordingHandler { ResponseBody = AccountJson };
        var client = ClientFor(handler);

        var account = await client.GetAccountAsync(Guid.Parse("22222222-2222-2222-2222-222222222222"));

        handler.LastRequest!.RequestUri!.AbsolutePath.ShouldBe("/v1/accounts/22222222-2222-2222-2222-222222222222");
        account.AccountNumber.ShouldBe("ACC0001");
    }

    [Fact]
    public async Task GetAccountBalanceAsync_ReadsBalance()
    {
        var handler = new RecordingHandler { ResponseBody = """{"currency":"SGD","balance":5,"availableBalance":5,"heldAmount":0}""" };
        var client = ClientFor(handler);

        var balance = await client.GetAccountBalanceAsync(Guid.Parse("22222222-2222-2222-2222-222222222222"));

        handler.LastRequest!.RequestUri!.AbsolutePath.ShouldEndWith("/balance");
        balance.Currency.ShouldBe("SGD");
    }

    [Fact]
    public async Task GetAccountStatusCountsAsync_WithNoWindow_BuildsThePlainPathAndReadsCounts()
    {
        var handler = new RecordingHandler
        {
            ResponseBody = """[{"type":"AccountStatus","status":"ACTIVE","count":4},{"type":"AccountStatus","status":"FROZEN","count":1}]"""
        };
        var client = ClientFor(handler);

        var counts = await client.GetAccountStatusCountsAsync();

        handler.LastRequest!.RequestUri!.ToString().ShouldBe($"{ServiceAddress}v1/accounts/status-counts");
        counts.Count.ShouldBe(2);
        counts.ShouldContain(c => c.Status == "ACTIVE" && c.Count == 4);
    }

    [Fact]
    public async Task GetLedgerBalancesAsync_ReadsOneLinePerCurrency()
    {
        var handler = new RecordingHandler
        {
            ResponseBody = """[{"currency":"SGD","balance":150.0,"available":150.0,"held":0.0},{"currency":"USD","balance":20.0,"available":20.0,"held":0.0}]"""
        };
        var client = ClientFor(handler);

        var lines = await client.GetLedgerBalancesAsync();

        handler.LastRequest!.RequestUri!.ToString().ShouldBe($"{ServiceAddress}v1/accounts/balances");
        lines.Count.ShouldBe(2);
        lines.Single(l => l.Currency == "SGD").Balance.ShouldBe(150.0m);
    }

    [Fact]
    public async Task ChangeAccountDetailsAsync_SendsPutWithName()
    {
        var handler = new RecordingHandler { ResponseBody = AccountJson };
        var client = ClientFor(handler);

        await client.ChangeAccountDetailsAsync(Guid.Parse("22222222-2222-2222-2222-222222222222"), "Operating 2");

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Put);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldBe("/v1/accounts/22222222-2222-2222-2222-222222222222");
        var body = await handler.LastRequest.Content!.ReadAsStringAsync();
        body.ShouldContain("\"name\":\"Operating 2\"");
    }

    [Fact]
    public async Task ChangeAccountDetailsAsync_SendsPutWithMetadata()
    {
        var handler = new RecordingHandler { ResponseBody = AccountJson };
        var client = ClientFor(handler);

        await client.ChangeAccountDetailsAsync(
            Guid.Parse("22222222-2222-2222-2222-222222222222"),
            metadata: new Dictionary<string, string> { ["k"] = "v" });

        handler.LastRequest!.RequestUri!.AbsolutePath.ShouldBe("/v1/accounts/22222222-2222-2222-2222-222222222222");
        var body = await handler.LastRequest.Content!.ReadAsStringAsync();
        body.ShouldContain("\"k\":\"v\"");
        // An omitted member goes over the wire as null — the server reads that as "leave it alone".
        body.ShouldContain("\"name\":null");
    }

    [Fact]
    public async Task UpdateAccountAsync_SendsPatchWithStatusAndLimits()
    {
        var handler = new RecordingHandler { ResponseBody = AccountJson };
        var client = ClientFor(handler);

        await client.UpdateAccountAsync(Guid.Parse("22222222-2222-2222-2222-222222222222"), AccountStatus.Closed, 100m, 0m);

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Patch);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldBe("/v1/accounts/22222222-2222-2222-2222-222222222222");
        var body = await handler.LastRequest.Content!.ReadAsStringAsync();
        body.ShouldContain("\"status\":\"closed\"");
        body.ShouldContain("\"overdraftLimit\":100");
        body.ShouldContain("\"minimumBalance\":0");
    }

    [Fact]
    public async Task GetAccountStatementAsync_BuildsFromToPageQueryString()
    {
        var handler = new RecordingHandler
        {
            ResponseBody = """{"items":[],"pageCount":0,"pageNumber":1,"pageSize":50,"totalItemCount":0,"hasNextPage":false,"hasPreviousPage":false}"""
        };
        var client = ClientFor(handler);

        await client.GetAccountStatementAsync(Guid.Parse("22222222-2222-2222-2222-222222222222"), new StatementQuery
        {
            From = new DateOnly(2026, 1, 1),
            To = new DateOnly(2026, 2, 1),
            PageIndex = 0,
            PageSize = 50
        });

        handler.LastRequest!.RequestUri!.AbsolutePath.ShouldEndWith("/statement");
        var query = handler.LastRequest.RequestUri.Query;
        query.ShouldContain("from=2026-01-01");
        query.ShouldContain("to=2026-02-01");
        query.ShouldContain("pageIndex=0");
        query.ShouldContain("pageSize=50");
    }

    [Fact]
    public async Task ListPostingsAsync_BuildsEveryQueryParameter()
    {
        var handler = new RecordingHandler
        {
            ResponseBody = """{"items":[],"pageCount":0,"pageNumber":1,"pageSize":10,"totalItemCount":0,"hasNextPage":false,"hasPreviousPage":false}"""
        };
        var client = ClientFor(handler);

        await client.ListPostingsAsync(new PostingsListQuery
        {
            From = new DateOnly(2026, 1, 1),
            To = new DateOnly(2026, 2, 1),
            AccountId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Direction = "Credit",
            Category = "Transfer",
            Status = "Posted",
            Search = "treasury",
            OrderBy = "PostingNumber",
            Desc = true,
            PageNumber = 2,
            PageSize = 10
        });

        handler.LastRequest!.RequestUri!.AbsolutePath.ShouldBe("/v1/postings");
        var query = handler.LastRequest.RequestUri.Query;
        query.ShouldContain("from=2026-01-01");
        query.ShouldContain("to=2026-02-01");
        query.ShouldContain("accountId=22222222-2222-2222-2222-222222222222");
        query.ShouldContain("direction=Credit");
        query.ShouldContain("category=Transfer");
        query.ShouldContain("status=Posted");
        query.ShouldContain("search=treasury");
        query.ShouldContain("orderBy=PostingNumber");
        query.ShouldContain("desc=true");
        query.ShouldContain("pageNumber=2");
        query.ShouldContain("pageSize=10");
    }

    [Fact]
    public async Task GetCurrencyAsync_ReadsOneCurrencyById()
    {
        var handler = new RecordingHandler { ResponseBody = CurrencyJson };
        var client = ClientFor(handler);

        var currency = await client.GetCurrencyAsync(Guid.Parse("33333333-3333-3333-3333-333333333333"));

        handler.LastRequest!.RequestUri!.AbsolutePath.ShouldBe("/v1/currencies/33333333-3333-3333-3333-333333333333");
        currency.Code.ShouldBe("SGD");
    }

    [Fact]
    public async Task RenameCurrencyAsync_SendsPutWithName()
    {
        var handler = new RecordingHandler { ResponseBody = CurrencyJson };
        var client = ClientFor(handler);

        await client.RenameCurrencyAsync(Guid.Parse("33333333-3333-3333-3333-333333333333"), "Singapore Dollar 2");

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Put);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldBe("/v1/currencies/33333333-3333-3333-3333-333333333333");
        var body = await handler.LastRequest.Content!.ReadAsStringAsync();
        body.ShouldContain("\"name\":\"Singapore Dollar 2\"");
    }

    [Fact]
    public async Task ActivateCurrencyAsync_SendsPostToActivateRoute()
    {
        var handler = new RecordingHandler { ResponseBody = CurrencyJson };
        var client = ClientFor(handler);

        await client.ActivateCurrencyAsync(Guid.Parse("33333333-3333-3333-3333-333333333333"));

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Post);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldEndWith("/activate");
    }

    [Fact]
    public async Task DeactivateCurrencyAsync_SendsPostToDeactivateRoute()
    {
        var handler = new RecordingHandler { ResponseBody = CurrencyJson };
        var client = ClientFor(handler);

        await client.DeactivateCurrencyAsync(Guid.Parse("33333333-3333-3333-3333-333333333333"));

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Post);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldEndWith("/deactivate");
    }

    [Fact]
    public async Task RecordPostingBatchAsync_SendsIdempotencyKeyHeaderAndReadsList()
    {
        var handler = new RecordingHandler { ResponseBody = $"[{PostingJson}]" };
        var client = ClientFor(handler);

        var postings = await client.RecordPostingBatchAsync(
            new RecordPostingBatchRequest
            {
                Movements =
                [
                    new PostingBatchMovement
                    {
                        AccountId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                        Direction = PostingDirection.Credit,
                        Amount = 10m,
                        Currency = "SGD",
                        Category = PostingCategory.Transfer
                    }
                ]
            },
            "batch-key-1");

        handler.LastRequest!.RequestUri!.AbsolutePath.ShouldEndWith("/postings/batch");
        handler.LastRequest.Headers.TryGetValues("Idempotency-Key", out var values).ShouldBeTrue();
        values!.ShouldContain("batch-key-1");
        postings.Single().PostingNumber.ShouldBe("1");
    }

    [Fact]
    public async Task GetPostingAsync_ReadsOnePostingById()
    {
        var handler = new RecordingHandler { ResponseBody = PostingJson };
        var client = ClientFor(handler);

        var posting = await client.GetPostingAsync(Guid.Parse("44444444-4444-4444-4444-444444444444"));

        handler.LastRequest!.RequestUri!.AbsolutePath.ShouldBe("/v1/postings/44444444-4444-4444-4444-444444444444");
        posting.Currency.ShouldBe("SGD");
    }

    [Fact]
    public async Task ReversePostingAsync_SendsTheReasonInTheBodyAndTheKeyInTheHeader()
    {
        var handler = new RecordingHandler { ResponseBody = PostingJson };
        var client = ClientFor(handler);

        await client.ReversePostingAsync(
            Guid.Parse("44444444-4444-4444-4444-444444444444"), "Duplicate of TX-991", "rev-key-1");

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Post);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldEndWith("/reverse");
        handler.LastRequest.Headers.TryGetValues("Idempotency-Key", out var values).ShouldBeTrue();
        values!.ShouldContain("rev-key-1");
        (await handler.LastRequest.Content!.ReadAsStringAsync()).ShouldContain("Duplicate of TX-991");
    }

    [Fact]
    public async Task ARefusalWithNoParsableBody_StillSurfacesTheStatusCode()
    {
        var handler = new RecordingHandler
        {
            ResponseStatusCode = System.Net.HttpStatusCode.InternalServerError,
            ResponseBody = "not json"
        };
        var client = ClientFor(handler);

        var exception = await Should.ThrowAsync<AccountApiException>(() => client.GetCurrencyAsync(Guid.NewGuid()));

        exception.StatusCode.ShouldBe(System.Net.HttpStatusCode.InternalServerError);
        exception.Errors.ShouldBeEmpty();
        exception.Message.ShouldContain("500");
    }

    [Fact]
    public async Task CreateAccountGroupAsync_SendsPostToAccountGroupsRoot()
    {
        var handler = new RecordingHandler { ResponseBody = GroupJson };
        var client = ClientFor(handler);

        await client.CreateAccountGroupAsync(new CreateAccountGroupRequest
        { Code = "CUST1", Name = "Group", Type = AccountGroupType.Customer, OwnerId = "PayHub" });

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Post);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldBe("/v1/account-groups");
    }

    [Fact]
    public async Task OpenAccountAsync_SendsPostToAccountsRoot()
    {
        var handler = new RecordingHandler { ResponseBody = AccountJson };
        var client = ClientFor(handler);

        await client.OpenAccountAsync(new OpenAccountRequest
        {
            GroupId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Operating",
            Currency = "SGD",
            Classification = AccountClassification.Asset
        });

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Post);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldBe("/v1/accounts");
    }

    [Fact]
    public async Task RecordPostingAsync_SendsPostToPostingsRoot()
    {
        var handler = new RecordingHandler { ResponseBody = PostingJson };
        var client = ClientFor(handler);

        await client.RecordPostingAsync(
            new RecordPostingRequest
            {
                AccountId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Direction = PostingDirection.Credit,
                Amount = 10m,
                Currency = "SGD",
                Category = PostingCategory.Transfer
            },
            "key-1");

        handler.LastRequest!.Method.ShouldBe(HttpMethod.Post);
        handler.LastRequest.RequestUri!.AbsolutePath.ShouldBe("/v1/postings");
    }

    [Fact]
    public async Task ResponseDeserialization_IsCaseInsensitiveToPropertyNames()
    {
        var handler = new RecordingHandler
        {
            ResponseBody = """{"Id":"33333333-3333-3333-3333-333333333333","Code":"SGD","Name":"Singapore Dollar","DecimalPlaces":2,"IsActive":true}"""
        };
        var client = ClientFor(handler);

        var currency = await client.GetCurrencyAsync(Guid.Parse("33333333-3333-3333-3333-333333333333"));

        currency.Code.ShouldBe("SGD");
    }

    [Fact]
    public async Task GetAccountsAsync_WithAnEmptyQuery_BuildsThePlainListPathWithNoQueryString()
    {
        var handler = new RecordingHandler
        {
            ResponseBody = """{"items":[],"pageCount":0,"pageNumber":1,"pageSize":1000,"totalItemCount":0,"hasNextPage":false,"hasPreviousPage":false}"""
        };
        var client = ClientFor(handler);

        await client.GetAccountsAsync(new AccountsListQuery());

        handler.LastRequest!.RequestUri!.ToString().ShouldBe($"{ServiceAddress}v1/accounts");
    }
}

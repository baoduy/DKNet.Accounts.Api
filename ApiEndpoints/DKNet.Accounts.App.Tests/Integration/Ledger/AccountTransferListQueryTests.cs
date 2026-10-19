using System.Globalization;
using System.Net;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.AppServices.Transfers.V1.Queries;
using DKNet.Accounts.AppServices.Transfers.V1.Specs;
using DKNet.Accounts.Domains.Features.Transfers.Entities;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>DRK-2300 §6a rows the HTTP scenarios leave to Build, on the InMemory host: <see cref="SpecListAccountTransfers"/>
/// through the repository (R1 sides, R3 whole UTC days, R4 letter case, R5 order and its id tie-break), the handler's
/// rate form (R7) and the route's answer to the extreme dates <see cref="DateOnly"/> holds (D5). Every test seeds
/// transfers under an account id of its own, so the shared database needs no reset.</summary>
public sealed class AccountTransferListQueryTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private readonly Guid _account = Guid.NewGuid();
    private readonly Guid _other = Guid.NewGuid();

    [Fact]
    public async Task Spec_ListsATransferOnAnyOfItsSides_AndNoOtherAccounts()
    {
        await SeedAsync(
            NewTransfer(_account, _other, null, 1m, "2026-10-19T10:00:00Z"),
            NewTransfer(_other, _account, null, 2m, "2026-10-19T10:00:00Z"),
            NewTransfer(_other, Guid.NewGuid(), _account, 3m, "2026-10-19T10:00:00Z"),
            NewTransfer(_other, Guid.NewGuid(), _other, 4m, "2026-10-19T10:00:00Z"));

        (await AmountsAsync(Spec(orderBy: "Amount"))).ShouldBe([1m, 2m, 3m]);
    }

    [Fact]
    public async Task Spec_ReadsWholeUtcDays_FromTheStartOfFromToTheEndOfTo()
    {
        await SeedAsync(
            NewTransfer(_account, _other, null, 1m, "2025-12-31T23:59:59Z"),
            NewTransfer(_account, _other, null, 2m, "2026-01-01T00:00:00Z"),
            NewTransfer(_account, _other, null, 3m, "2026-01-01T23:30:00Z"),
            NewTransfer(_account, _other, null, 4m, "2026-01-02T00:00:00Z"));

        (await AmountsAsync(Spec(from: "2026-01-01", to: "2026-01-01", orderBy: "Amount"))).ShouldBe([2m, 3m]);
    }

    [Fact]
    public async Task Spec_WithTheLastDateDateOnlyHolds_HasNoUpperBound()
    {
        await SeedAsync(NewTransfer(_account, _other, null, 1m, "9999-12-31T23:59:59Z"));

        (await AmountsAsync(Spec(from: "9999-01-01", to: "9999-12-31"))).ShouldBe([1m]);
    }

    [Theory]
    [InlineData("PAYROLL")]
    [InlineData("payroll")]
    [InlineData("Oct-001")]
    public async Task Spec_SearchesTheIdempotencyKeyWithoutRegardToCase(string search)
    {
        await SeedAsync(
            NewTransfer(_account, _other, null, 10m, "2026-10-19T10:00:00Z", key: $"payroll-oct-001-{_account:N}"),
            NewTransfer(_account, _other, null, 20m, "2026-10-19T10:00:00Z", key: $"refund-778-{_account:N}"));

        (await AmountsAsync(Spec(search: search))).ShouldBe([10m]);
    }

    [Fact]
    public async Task Spec_MatchesAStoredValueOfAnyCase()
    {
        // A key stored before keys were lowercased (DRK-2120) and a calling system in its credential's own case.
        await SeedAsync(
            NewTransfer(_account, _other, null, 10m, "2026-10-19T10:00:00Z", key: $"PAYROLL-Oct-{_account:N}"),
            NewTransfer(_account, _other, null, 20m, "2026-10-19T10:00:00Z", callingSystem: "Treasury-Ops"),
            NewTransfer(_account, _other, null, 30m, "2026-10-19T10:00:00Z", callingSystem: "PayHub"));

        (await AmountsAsync(Spec(search: "payroll"))).ShouldBe([10m]);
        (await AmountsAsync(Spec(search: "treasury"))).ShouldBe([20m]);
    }

    [Fact]
    public async Task Spec_SearchesTheCallingSystemWithoutRegardToCase()
    {
        await SeedAsync(
            NewTransfer(_account, _other, null, 10m, "2026-10-19T10:00:00Z", callingSystem: "PayHub"),
            NewTransfer(_account, _other, null, 20m, "2026-10-19T10:00:00Z", callingSystem: "treasury-ops"));

        (await AmountsAsync(Spec(search: "TREASURY"))).ShouldBe([20m]);
    }

    [Theory]
    [InlineData(false)]
    // D7: desc means nothing without a sort field; the default stays newest first.
    [InlineData(true)]
    public async Task Spec_WithNoSortField_PutsTheNewestFirst(bool desc)
    {
        await SeedAsync(
            NewTransfer(_account, _other, null, 10m, "2026-10-19T08:00:00Z"),
            NewTransfer(_account, _other, null, 30m, "2026-10-19T09:00:00Z"),
            NewTransfer(_account, _other, null, 20m, "2026-10-19T10:00:00Z"));

        (await AmountsAsync(Spec(desc: desc))).ShouldBe([20m, 30m, 10m]);
    }

    [Theory]
    [InlineData("ConvertedAmount", false, new[] { 10.0, 20.0, 30.0 })]
    [InlineData("ConvertedAmount", true, new[] { 30.0, 20.0, 10.0 })]
    [InlineData("Fee", false, new[] { 30.0, 10.0, 20.0 })]
    [InlineData("RecordedAt", true, new[] { 20.0, 30.0, 10.0 })]
    public async Task Spec_SortsByTheNamedField(string orderBy, bool desc, double[] amounts)
    {
        await SeedAsync(
            NewTransfer(_account, _other, null, 10m, "2026-10-19T08:00:00Z", fee: 1m),
            NewTransfer(_account, _other, null, 30m, "2026-10-19T09:00:00Z", fee: 0m),
            NewTransfer(_account, _other, null, 20m, "2026-10-19T10:00:00Z", fee: 2m));

        (await AmountsAsync(Spec(orderBy: orderBy, desc: desc))).ShouldBe(amounts.Select(a => (decimal)a));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("Amount")]
    public async Task Spec_BreaksEveryTieByIdAscending(string? orderBy)
    {
        // Equal amounts and times, saved in descending id order: only the id tie-break reads them ascending.
        var transfers = Enumerable.Range(0, 5)
            .Select(_ => NewTransfer(_account, _other, null, 10m, "2026-10-19T10:00:00Z"))
            .OrderByDescending(t => t.Id)
            .ToArray();
        await SeedAsync(transfers);

        using var scope = fixture.CreateScope();
        var listed = await scope.ServiceProvider.GetRequiredService<IRepositorySpec>().ToListAsync(Spec(orderBy: orderBy));

        listed.Select(t => t.Id).ShouldBe(transfers.Select(t => t.Id).Order());
    }

    [Fact]
    public async Task Handler_WritesTheRateWithoutTrailingZeros_AndPagesTheRows()
    {
        await SeedAsync(
            NewTransfer(_account, _other, null, 100m, "2026-10-19T10:00:00Z", rate: 0.74000000m),
            NewTransfer(_account, _other, null, 50m, "2026-10-19T09:00:00Z"));

        using var scope = fixture.CreateScope();
        var page = await new ListAccountTransfersQueryHandler(scope.ServiceProvider.GetRequiredService<IRepositorySpec>())
            .OnHandle(new ListAccountTransfersQuery { AccountId = _account, To = Date("2026-10-19"), PageSize = 1 },
                CancellationToken.None);

        page.TotalItemCount.ShouldBe(2);
        page.PageCount.ShouldBe(2);
        var row = page.ShouldHaveSingleItem();
        row.Amount.ShouldBe(100m);
        row.ExchangeRate!.Value.ToString(CultureInfo.InvariantCulture).ShouldBe("0.74");
    }

    [Fact]
    public async Task Handler_ResolvesTheSortFieldInAnyCase()
    {
        await SeedAsync(
            NewTransfer(_account, _other, null, 20m, "2026-10-19T08:00:00Z"),
            NewTransfer(_account, _other, null, 10m, "2026-10-19T09:00:00Z"),
            NewTransfer(_account, _other, null, 30m, "2026-10-19T10:00:00Z"));

        using var scope = fixture.CreateScope();
        var page = await new ListAccountTransfersQueryHandler(scope.ServiceProvider.GetRequiredService<IRepositorySpec>())
            .OnHandle(new ListAccountTransfersQuery { AccountId = _account, To = Date("2026-10-19"), OrderBy = "aMOUNT" },
                CancellationToken.None);

        page.Select(r => r.Amount).ShouldBe([10m, 20m, 30m]);
    }

    [Theory]
    [InlineData("?to=9999-12-31")]
    [InlineData("?to=0001-01-01")]
    [InlineData("?from=9999-01-01&to=9999-12-31")]
    public async Task Route_AnExtremeWindowWithinOneYear_IsAnEmptyPage(string query)
    {
        var (status, body) = await ListOverHttpAsync(query);

        status.ShouldBe(HttpStatusCode.OK, body);
        JsonDocument.Parse(body).RootElement.GetProperty("items").GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task Route_TheWholeDateRange_IsRefusedWithInvalidDateRange()
    {
        var (status, body) = await ListOverHttpAsync("?from=0001-01-01&to=9999-12-31");

        status.ShouldBe(HttpStatusCode.UnprocessableEntity, body);
        JsonDocument.Parse(body).RootElement.GetProperty("errors").EnumerateArray()
            .ShouldHaveSingleItem().GetProperty("code").GetString().ShouldBe("INVALID_DATE_RANGE");
    }

    private SpecListAccountTransfers Spec(
        string from = "2026-01-01", string to = "2026-12-31", string? search = null, string? orderBy = null,
        bool desc = false) =>
        new(_account, Date(from), Date(to), search, orderBy, desc);

    private async Task SeedAsync(params Transfer[] transfers)
    {
        using var scope = fixture.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        foreach (var transfer in transfers)
        {
            // No caller here to stamp CreatedBy from, so setup writes it (as CurrentUserAuditStampTests does).
            dbContext.Add(transfer).Property(nameof(Transfer.CreatedBy)).CurrentValue = "seed-setup";
        }

        await dbContext.SaveChangesAsync();
    }

    private async Task<List<decimal>> AmountsAsync(SpecListAccountTransfers spec)
    {
        using var scope = fixture.CreateScope();
        var listed = await scope.ServiceProvider.GetRequiredService<IRepositorySpec>().ToListAsync(spec);
        return [.. listed.Select(t => t.Amount)];
    }

    private async Task<(HttpStatusCode Status, string Body)> ListOverHttpAsync(string query)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/v1/accounts/{_account}/transfers{query}");
        request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
        request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, ScopeNames.PostingsRead);
        using var response = await fixture.CreateClient().SendAsync(request);
        return (response.StatusCode, await response.Content.ReadAsStringAsync());
    }

    private static Transfer NewTransfer(
        Guid source, Guid destination, Guid? feeAccount, decimal amount, string recordedAt, decimal fee = 0m,
        decimal? rate = null, string? key = null, string callingSystem = "PayHub") =>
        new(source, destination, amount, "SGD", rate is null ? "SGD" : "USD", rate, fee, feeAccount, amount - fee,
            DateTimeOffset.Parse(recordedAt, CultureInfo.InvariantCulture), callingSystem, key ?? $"k-{Guid.NewGuid():N}");

    private static DateOnly Date(string text) => DateOnly.ParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture);
}

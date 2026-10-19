using System.Globalization;
using DKNet.Accounts.AppServices.Share;
using DKNet.Accounts.AppServices.Transfers.V1.Queries;
using DKNet.Accounts.AppServices.Transfers.V1.Specs;

namespace DKNet.Accounts.App.Tests.Unit.Transfers;

/// <summary>DRK-2300 §6a rows the HTTP scenarios leave to Build: the window resolver (D2–D5), the page clamps (D9)
/// and the validator's window, search and sort refusals (D6, D7). <see cref="SpecListAccountTransfers"/> itself runs
/// through the repository in <c>AccountTransferListQueryTests</c>.</summary>
public sealed class AccountTransferListTests
{
    private static readonly Guid Account = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");

    [Theory]
    [InlineData(null, "2026-10-19", "2025-10-19", "2026-10-19")]
    // D4: a defaulted 'from' is valid by construction, even 1 year before 29 February.
    [InlineData(null, "2028-02-29", "2027-02-28", "2028-02-29")]
    [InlineData("2028-02-29", "2029-02-28", "2028-02-29", "2029-02-28")]
    [InlineData("2026-10-19", "2026-10-19", "2026-10-19", "2026-10-19")]
    // D5: the extremes DateOnly holds never throw.
    [InlineData(null, "9999-12-31", "9998-12-31", "9999-12-31")]
    [InlineData(null, "0001-01-01", "0001-01-01", "0001-01-01")]
    [InlineData("9999-06-01", "9999-12-31", "9999-06-01", "9999-12-31")]
    public void Window_AcceptsAndResolves(string? from, string to, string resolvedFrom, string resolvedTo) =>
        AccountTransferListArguments.Window(DateOrNull(from), Date(to)).ShouldBe((Date(resolvedFrom), Date(resolvedTo)));

    [Theory]
    [InlineData("2025-10-18", "2026-10-19")]
    [InlineData("2028-02-29", "2029-03-01")]
    [InlineData("2026-10-19", "2026-10-18")]
    [InlineData("0001-01-01", "9999-12-31")]
    public void Window_RefusesTooLongOrReversed(string from, string to) =>
        AccountTransferListArguments.Window(Date(from), Date(to)).ShouldBeNull();

    [Theory]
    [InlineData(null, 1)]
    [InlineData(0, 1)]
    [InlineData(-1, 1)]
    [InlineData(1, 1)]
    [InlineData(7, 7)]
    public void PageNumber_FallsBackToTheFirstPage(int? pageNumber, int expected) =>
        AccountTransferListArguments.PageNumber(pageNumber).ShouldBe(expected);

    [Theory]
    [InlineData(null, 20)]
    [InlineData(0, 20)]
    [InlineData(-1, 20)]
    [InlineData(1, 1)]
    [InlineData(1000, 1000)]
    [InlineData(1001, 1000)]
    [InlineData(5000, 1000)]
    public void PageSize_FallsBackTo20AndCapsAt1000(int? pageSize, int expected) =>
        AccountTransferListArguments.PageSize(pageSize).ShouldBe(expected);

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("pa", null)]
    [InlineData(null, "RECORDEDAT")]
    [InlineData(null, "amount")]
    [InlineData(null, "convertedamount")]
    [InlineData(null, "Fee")]
    public void Validator_AcceptsAKnownSortFieldInAnyCase(string? search, string? orderBy)
    {
        var result = new ListAccountTransfersQueryValidator().Validate(Query(search: search, orderBy: orderBy));

        result.Errors.ShouldBeEmpty();
    }

    [Theory]
    [InlineData("a", null, "Search", "A search term must be at least 2 characters.")]
    [InlineData(null, "postings", "OrderBy", "'postings' is not a field transfers can be ordered by.")]
    public void Validator_RefusesAShortSearchOrAnUnknownSortField(
        string? search, string? orderBy, string property, string message)
    {
        var error = new ListAccountTransfersQueryValidator().Validate(Query(search: search, orderBy: orderBy))
            .Errors.ShouldHaveSingleItem();

        error.PropertyName.ShouldBe(property);
        error.ErrorMessage.ShouldBe(message);
        error.ErrorCode.ShouldNotBe(LedgerErrors.InvalidDateRange);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("2026-10-20", "2026-10-19")]
    public void Validator_RefusesAMissingOrReversedWindowWithInvalidDateRange(string? from, string? to)
    {
        var query = Query() with { From = DateOrNull(from), To = DateOrNull(to) };

        new ListAccountTransfersQueryValidator().Validate(query)
            .Errors.ShouldHaveSingleItem().ErrorCode.ShouldBe(LedgerErrors.InvalidDateRange);
    }

    private static ListAccountTransfersQuery Query(string? search = null, string? orderBy = null) => new()
    {
        AccountId = Account,
        To = Date("2026-10-19"),
        Search = search,
        OrderBy = orderBy
    };

    private static DateOnly Date(string text) => DateOnly.ParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static DateOnly? DateOrNull(string? text) => text is null ? null : Date(text);
}

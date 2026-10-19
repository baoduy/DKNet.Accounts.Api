using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.AppServices.Postings.V1.Queries;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>DRK-2318 R1: the page number arm the HTTP reproductions leave open — a page number of 1 or more is
/// read as sent, not clamped to page 1. Seeds postings under an account id of its own, so the shared database
/// needs no reset.</summary>
public sealed class ListPostingsQueryHandlerTests(LedgerApiFixture fixture) : IClassFixture<LedgerApiFixture>
{
    private readonly Guid _account = Guid.NewGuid();

    [Fact]
    public async Task Handler_APageNumberAboveOne_ReadsThatPage()
    {
        using var scope = fixture.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        for (var position = 1; position <= 3; position++)
        {
            var posting = new Posting(
                _account, $"P{position}", position, PostingDirection.Credit, 10m, "SGD", 10m, 10m * position,
                new DateOnly(2026, 4, position), DateTimeOffset.UnixEpoch, PostingCategory.Transfer,
                null, null, null, "PayHub", null, null, null, null, null);
            // No caller here to stamp CreatedBy from, so setup writes it (as CurrentUserAuditStampTests does).
            dbContext.Add(posting).Property(nameof(Posting.CreatedBy)).CurrentValue = "seed-setup";
        }

        await dbContext.SaveChangesAsync();

        var page = await new ListPostingsQueryHandler(scope.ServiceProvider.GetRequiredService<IRepositorySpec>())
            .OnHandle(new ListPostingsQuery
            {
                From = new DateOnly(2026, 4, 1),
                To = new DateOnly(2026, 4, 30),
                AccountId = _account,
                PageNumber = 2,
                PageSize = 2
            }, CancellationToken.None);

        page.PageNumber.ShouldBe(2);
        page.ShouldHaveSingleItem().PostingNumber.ShouldBe("P3");
    }
}

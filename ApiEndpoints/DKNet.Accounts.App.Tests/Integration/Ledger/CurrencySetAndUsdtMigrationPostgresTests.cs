using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// The DRK-1719 migration's way back: rolling it back returns the columns to their pre-change shape and takes
/// out exactly the rows it seeded, and applying it again restores both. Its way forward is the §5 upgrade
/// scenarios' (BDD, <c>CurrencySetAndUsdt.feature</c>).
/// </summary>
public sealed class CurrencySetAndUsdtMigrationPostgresTests(PostgresLedgerApiFixture fixture)
    : IClassFixture<PostgresLedgerApiFixture>
{
    private const string Initial = "20260921002809_Initial";

    private static Task<int> ScalarAsync(CoreDbContext db, string sql) =>
        db.Database.SqlQueryRaw<int>(sql).SingleAsync();

    private static Task<int> BalanceScaleAsync(CoreDbContext db) => ScalarAsync(db, """
        SELECT numeric_scale AS "Value" FROM information_schema.columns
        WHERE table_schema = 'pro' AND table_name = 'Accounts' AND column_name = 'Balance'
        """);

    private static Task<int> CodeLengthAsync(CoreDbContext db) => ScalarAsync(db, """
        SELECT character_maximum_length AS "Value" FROM information_schema.columns
        WHERE table_schema = 'pro' AND table_name = 'Currencies' AND column_name = 'Code'
        """);

    private static Task<int> CurrencyCountAsync(CoreDbContext db) =>
        ScalarAsync(db, """SELECT count(*)::int AS "Value" FROM pro."Currencies" """);

    [Fact]
    public async Task RollingBackAndReapplying_RestoresTheShapeAndTheSeedEachWay()
    {
        using var scope = fixture.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var migrator = db.GetService<IMigrator>();

        await migrator.MigrateAsync(Initial);

        (await BalanceScaleAsync(db)).ShouldBe(2);
        (await CodeLengthAsync(db)).ShouldBe(3);
        (await CurrencyCountAsync(db)).ShouldBe(3);

        await db.Database.MigrateAsync();

        (await BalanceScaleAsync(db)).ShouldBe(6);
        (await CodeLengthAsync(db)).ShouldBe(10);
        (await CurrencyCountAsync(db)).ShouldBe(26);
    }
}

using Microsoft.EntityFrameworkCore;
using DKNet.Accounts.Infra.Contexts;
using DKNet.Accounts.Infra.Extensions;
using DKNet.Accounts.Infra.Features.Currencies;
using Testcontainers.PostgreSql;
using DKNet.Accounts.Infra.Postgres;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// The currency seed lives in <see cref="CurrencySeeding"/>, not in a migration, so regenerating the migrations
/// folder can never drop it. Runs the API's real startup path (<see cref="InfraMigration.MigrateDb"/>) on an empty
/// database — the DI context of <c>TestApiFactoryBase</c> has no <c>UseAutoDataSeeding</c>, so it would prove nothing.
/// </summary>
public sealed class CurrencySeedingPostgresTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine").Build();

    public Task InitializeAsync() => _container.StartAsync();

    public async Task DisposeAsync() => await _container.DisposeAsync();

    [Fact]
    public async Task MigratingTwice_SeedsEveryCurrencyOnceUnderItsFixedId()
    {
        var conn = _container.GetConnectionString();

        await InfraMigration.MigrateDb(conn, (builder, c) => builder.UsePostgres(c));
        await InfraMigration.MigrateDb(conn, (builder, c) => builder.UsePostgres(c));

        await using var db = new CoreDbContext(new DbContextOptionsBuilder<CoreDbContext>().UseNpgsql(conn).Options);
        var rows = await db.Database
            .SqlQueryRaw<Guid>("""SELECT "Id" AS "Value" FROM acc."Currencies" """)
            .ToListAsync();

        rows.Order().ShouldBe(SeededCurrencies.All.Select(c => c.Id).Order());
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging.Abstractions;
using DKNet.EfCore.AuditLogs;
using DKNet.Accounts.AppServices;
using DKNet.Accounts.Domains.Features.Currencies.Entities;
using DKNet.Accounts.Infra.Contexts;
using DKNet.Accounts.Infra.Extensions;
using DKNet.Accounts.Share;
using DKNet.Accounts.Share.Options;
using Npgsql;
using Testcontainers.PostgreSql;
using DKNet.Accounts.Infra.Postgres;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// DRK-1773 R1 against a REAL PostgreSQL: a saved change and the outbox row of the event it raises commit or roll
/// back together. The bus is on with Azure Service Bus as the transport and a fake connection, so nothing ever
/// leaves the process — the bus is never started, and only the outbox table is read.
/// </summary>
public sealed class OutboxTransactionPostgresTests : IAsyncLifetime
{
    /// <summary>A fixed signed-in user, so the audit hook can stamp <c>CreatedBy</c> outside an HTTP request.</summary>
    private sealed class FixedDataOwnerProvider : ICurrentUserProvider
    {
        public string? GetCurrentUser() => "PayHub";
    }

    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine").Build();
    private ServiceProvider _services = null!;

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"ConnectionStrings:{SharedConsts.DbConnectionString}"] = _container.GetConnectionString(),
                [$"ConnectionStrings:{SharedConsts.AzureBusConnectionString}"] =
                    "Endpoint=sb://fake.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=v"
            })
            .Build();

        var services = new ServiceCollection()
            .AddSingleton<IConfiguration>(config)
            .AddAppServices()
            .AddInfraServices((builder, conn) => builder.UsePostgres(conn))
            .AddCurrentUserProvider<CoreDbContext, FixedDataOwnerProvider>()
            .AddLogging()
            // The outbox's clean-up task needs the host's lifetime; this bare collection is not a host.
            .AddSingleton<IHostApplicationLifetime>(new ApplicationLifetime(NullLogger<ApplicationLifetime>.Instance));
        services.AddServiceBus(config, typeof(AppSetup).Assembly, new FeatureOptions { EnableServiceBus = true },
            PostgresSetup.AddPostgresOutbox);
        _services = services.BuildServiceProvider();

        await using var scope = _services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<CoreDbContext>().Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _services.DisposeAsync();
        await _container.DisposeAsync();
    }

    [Fact]
    public async Task ASavedChange_StoresItsEventInTheOutbox_WithAMessageId()
    {
        var currency = await SaveCurrencyAsync("R1A", commit: null);

        (await OutboxRowsForAsync(currency.Id)).ShouldBe(1);
        (await MessageIdOfAsync(currency.Id)).ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task ASaveInsideACommittedTransaction_StoresItsEvent()
    {
        var currency = await SaveCurrencyAsync("R1B", commit: true);

        (await OutboxRowsForAsync(currency.Id)).ShouldBe(1);
    }

    [Fact]
    public async Task ASaveInsideARolledBackTransaction_LeavesNeitherTheChangeNorItsEvent()
    {
        var currency = await SaveCurrencyAsync("R1C", commit: false);

        (await OutboxRowsForAsync(currency.Id)).ShouldBe(0);
        await using var scope = _services.CreateAsyncScope();
        (await scope.ServiceProvider.GetRequiredService<CoreDbContext>().Set<Currency>()
            .AnyAsync(c => c.Id == currency.Id)).ShouldBeFalse();
    }

    [Fact]
    public async Task AFailedSave_StoresNoEvent()
    {
        // A saved change first, so the outbox is live; then SGD, seeded by the migrations, a second time — it
        // breaks the unique code index.
        var saved = await SaveCurrencyAsync("R1D", commit: null);
        (await OutboxRowsForAsync(saved.Id)).ShouldBe(1);

        await using var scope = _services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var duplicate = new Currency("SGD", "Duplicate", 2);
        db.Add(duplicate);

        await Should.ThrowAsync<DbUpdateException>(() => db.SaveChangesAsync());

        (await OutboxRowsForAsync(duplicate.Id)).ShouldBe(0);
    }

    [Fact]
    public async Task ASaveThatDoesNotAcceptItsChanges_CommitsThemAndLeavesThemPending()
    {
        await using var scope = _services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var currency = new Currency("R1G", "R1G currency", 2);
        db.Add(currency);

        await db.SaveChangesAsync(acceptAllChangesOnSuccess: false);

        db.Entry(currency).State.ShouldBe(EntityState.Added);
        (await OutboxRowsForAsync(currency.Id)).ShouldBe(1);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(true)]
    public async Task AnEventThatCannotBeStored_FailsTheSave_AndNeitherIsKept(bool? commit)
    {
        await SaveCurrencyAsync("R1E", commit: null);
        await RenameOutboxAsync("smb_outbox", "smb_outbox_gone");

        var failure = await Should.ThrowAsync<InvalidOperationException>(() => SaveCurrencyAsync("R1F", commit));

        failure.Message.ShouldBe("An outbound event of this save could not be stored, so the save is not kept.");
        await using var scope = _services.CreateAsyncScope();
        (await scope.ServiceProvider.GetRequiredService<CoreDbContext>().Set<Currency>()
            .AnyAsync(c => c.Code == "R1F")).ShouldBeFalse();
    }

    [Fact]
    public async Task AfterAnEventCouldNotBeStored_TheNextSaveOfTheSameContextIsKept()
    {
        await SaveCurrencyAsync("R1H", commit: null);
        await using var scope = _services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        await RenameOutboxAsync("smb_outbox", "smb_outbox_gone");
        db.Add(new Currency("R1I", "R1I currency", 2));
        await Should.ThrowAsync<InvalidOperationException>(() => db.SaveChangesAsync());

        await RenameOutboxAsync("smb_outbox_gone", "smb_outbox");
        await db.SaveChangesAsync();

        (await db.Set<Currency>().AsNoTracking().AnyAsync(c => c.Code == "R1I")).ShouldBeTrue();
    }

    /// <summary>Saves a new currency — in no transaction of the caller's (<paramref name="commit"/> null), or inside
    /// one the caller then commits or rolls back.</summary>
    private async Task<Currency> SaveCurrencyAsync(string code, bool? commit)
    {
        await using var scope = _services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var currency = new Currency(code, $"{code} currency", 2);
        db.Add(currency);

        if (commit is null)
        {
            await db.SaveChangesAsync();
            return currency;
        }

        // A caller's own transaction runs inside the execution strategy, as EF Core requires with retries on.
        await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            await db.SaveChangesAsync();
            if (commit.Value)
            {
                await transaction.CommitAsync();
            }
            else
            {
                await transaction.RollbackAsync();
            }
        });

        return currency;
    }

    /// <summary>Takes the outbox table away (or brings it back), so storing an event fails inside the save.</summary>
    private async Task RenameOutboxAsync(string from, string to)
    {
        await using var connection = new NpgsqlConnection(_container.GetConnectionString());
        await connection.OpenAsync();
        await using var rename = new NpgsqlCommand($"ALTER TABLE public.{from} RENAME TO {to}", connection);
        await rename.ExecuteNonQueryAsync();
    }

    private Task<long> OutboxRowsForAsync(Guid id) =>
        ScalarAsync<long>("SELECT COUNT(*) FROM public.smb_outbox WHERE convert_from(message_payload, 'UTF8')::jsonb -> 'payload' ->> 'id' = @id",
            id);

    private Task<string?> MessageIdOfAsync(Guid id) =>
        ScalarAsync<string?>(
            "SELECT headers ->> 'OutboundMessageId' FROM public.smb_outbox WHERE convert_from(message_payload, 'UTF8')::jsonb -> 'payload' ->> 'id' = @id",
            id);

    private async Task<T> ScalarAsync<T>(string sql, Guid id)
    {
        await using var connection = new NpgsqlConnection(_container.GetConnectionString());
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", id.ToString());
        return (T)(await command.ExecuteScalarAsync())!;
    }
}

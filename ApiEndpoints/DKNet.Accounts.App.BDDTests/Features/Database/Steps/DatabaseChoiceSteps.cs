using DKNet.Accounts.Api.Configs;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.Domains.Services;
using DKNet.AspCore.Extensions.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace DKNet.Accounts.App.BDDTests.Features.Database.Steps;

/// <summary>
/// Step bindings for DRK-2120 surface A (DatabaseChoice.feature). The @unit scenarios drive the API's own
/// start-up composition (<see cref="DatabaseSettingApiFactory"/>) pointed at a server that does not exist, so no
/// database or container is needed; the setting itself is also read through <see cref="DatabaseConfig.ResolveProvider"/>.
/// The PostgreSQL search scenario's ledger steps live in <c>IdempotencyKeyCaseSteps</c>.
/// </summary>
[Binding]
public sealed class DatabaseChoiceSteps(BddApiFactory sharedHost)
{
    private const string PostgresProviderName = "Npgsql.EntityFrameworkCore.PostgreSQL";
    private const string SqlServerProviderName = "Microsoft.EntityFrameworkCore.SqlServer";
    private const string IdempotencyIndexName = "IX_Postings_CallingSystem_IdempotencyKey";

    // Nothing listens on port 1: a host pointed here can be composed, but any real database call fails fast.
    private const string UnreachablePostgres = "Host=127.0.0.1;Port=1;Database=AppDb;Username=postgres;Password=unused;Timeout=2";
    private const string UnreachableSqlServer = "Server=127.0.0.1,1;Database=AppDb;User Id=sa;Password=unused;Connect Timeout=2;TrustServerCertificate=True";

    private string? _setting;
    private DatabaseSettingApiFactory? _host;
    private Exception? _startupError;
    private DatabaseProvider? _resolved;
    private Exception? _resolveError;
    private IMigrationsAssembly? _migrations;
    private string? _number;
    private Exception? _numberError;
    private IIndex? _keyIndex;
    private Exception? _dbException;
    private ProblemDetails? _problem;
    private string? _scratchConnectionString;
    private string[] _historyBeforeStart = [];

    [AfterScenario]
    public async Task DisposeHostAsync()
    {
        if (_host is not null)
        {
            await _host.DisposeAsync();
        }
    }

    #region Given

    [Given(@"^the database setting is ""([^""]*)""$")]
    public void GivenTheDatabaseSettingIs(string setting) => _setting = setting;

    [Given(@"^the database setting is absent$")]
    public void GivenTheDatabaseSettingIsAbsent() => _setting = null;

    [Given(@"^a PostgreSQL database migrated by the release before this change$")]
    public async Task GivenAPostgreSqlDatabaseMigratedByTheReleaseBeforeThisChange()
    {
        // The release before DRK-2120, frozen as the SQL its migrations produced (dotnet ef migrations script
        // --idempotent at 79ca620): the schema plus its history rows in migrate."CoreDbContext".
        var script = await File.ReadAllTextAsync(
            Path.Combine(AppContext.BaseDirectory, "Features", "Database", "Data", "release-before-drk-2120.sql"));

        var database = $"upgrade_{Guid.NewGuid():N}";
        await using (var server = new NpgsqlConnection(sharedHost.ContainerConnectionString))
        {
            await server.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE \"{database}\"", server);
            await create.ExecuteNonQueryAsync();
        }

        _scratchConnectionString = new NpgsqlConnectionStringBuilder(sharedHost.ContainerConnectionString)
        {
            Database = database
        }.ConnectionString;

        await using (var connection = new NpgsqlConnection(_scratchConnectionString))
        {
            await connection.OpenAsync();
            await using var migrate = new NpgsqlCommand(script, connection);
            await migrate.ExecuteNonQueryAsync();
        }

        _historyBeforeStart = await ReadMigrationHistoryAsync();
        _historyBeforeStart.ShouldNotBeEmpty();

        // The script creates no currencies: the start-up migration seeds them, which is what shows below that
        // the service really migrated this database rather than skipping it.
        (await CountCurrenciesAsync()).ShouldBe(0);
    }

    [Given(@"^the (PostgreSQL|SQL Server) database rejects a posting because its idempotency key already exists$")]
    public void GivenTheDatabaseRejectsAPostingBecauseItsIdempotencyKeyAlreadyExists(string database)
    {
        // Each provider's own duplicate-key message, as its driver puts it on the exception EF Core wraps.
        var driverMessage = database == "PostgreSQL"
            ? "23505: duplicate key value violates unique constraint \"IX_Postings_CallingSystem_IdempotencyKey\""
            : "Cannot insert duplicate key row in object 'dbo.Postings' with unique index " +
              "'IX_Postings_CallingSystem_IdempotencyKey'. The duplicate key value is (treasury-ops, abc).";
        _dbException = new DbUpdateException(
            "An error occurred while saving the entity changes. See the inner exception for details.",
            new Exception(driverMessage));
    }

    #endregion

    #region When

    [When(@"^the service starts$")]
    public async Task WhenTheServiceStarts()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(_setting is null ? [] : [new KeyValuePair<string, string?>("Database:Provider", _setting)])
            .Build();
        try
        {
            _resolved = DatabaseConfig.ResolveProvider(configuration);
        }
        catch (Exception ex)
        {
            _resolveError = ex;
        }

        await StartHostAsync();
    }

    [When(@"^the service lists the migrations it would apply$")]
    public async Task WhenTheServiceListsTheMigrationsItWouldApply()
    {
        await StartHostAsync();
        using var scope = RequireHost().Services.CreateScope();
        _migrations = scope.ServiceProvider.GetRequiredService<CoreDbContext>().GetService<IMigrationsAssembly>();
    }

    [When(@"^the service needs the next (account number|posting number|membership number)$")]
    public async Task WhenTheServiceNeedsTheNext(string number)
    {
        await StartHostAsync();
        using var scope = RequireHost().Services.CreateScope();
        ISequenceServices generator = number switch
        {
            "account number" => scope.ServiceProvider.GetRequiredService<IAccountNumberGenerator>(),
            "posting number" => scope.ServiceProvider.GetRequiredService<IPostingNumberGenerator>(),
            _ => scope.ServiceProvider.GetRequiredService<IMembershipService>()
        };

        try
        {
            _number = await generator.NextValueAsync();
        }
        catch (Exception ex)
        {
            _numberError = ex;
        }
    }

    /// <summary>
    /// No SQL Server runs in this suite (spec §4), so the 2 key-less postings are not written: whether they collide
    /// is decided by the unique index on (CallingSystem, IdempotencyKey), read here from the model the host's SQL
    /// Server migrations are generated from (the design-time model keeps the relational index filter).
    /// </summary>
    [When(@"^""[^""]+"" records 2 postings that carry no idempotency key$")]
    public async Task WhenRecords2PostingsThatCarryNoIdempotencyKey()
    {
        await StartHostAsync();
        using var scope = RequireHost().Services.CreateScope();
        var model = scope.ServiceProvider.GetRequiredService<CoreDbContext>().GetService<IDesignTimeModel>().Model;

        _keyIndex = model.FindEntityType(typeof(Posting))!.GetIndexes()
            .SingleOrDefault(index => index.GetDatabaseName() == IdempotencyIndexName);
    }

    [When(@"^the service starts on the new release$")]
    public async Task WhenTheServiceStartsOnTheNewRelease()
    {
        (_host, _startupError) = await DatabaseSettingApiFactory.StartAsync(
            setting: null, _scratchConnectionString!, runDbMigrationWhenAppStart: true);
    }

    [When(@"^the service builds the error response$")]
    public void WhenTheServiceBuildsTheErrorResponse()
    {
        var context = new ErrorResponseContext { Source = ErrorSource.Unhandled, Errors = [], Exception = _dbException };
        _problem = LedgerErrorResponseOptions.UnhandledError(context, false, new HttpContextAccessor());
    }

    #endregion

    #region Then

    [Then(@"^the service uses (PostgreSQL|SQL Server)$")]
    public void ThenTheServiceUses(string database)
    {
        _startupError.ShouldBeNull();
        using var scope = RequireHost().Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<CoreDbContext>().Database.ProviderName
            .ShouldBe(database == "PostgreSQL" ? PostgresProviderName : SqlServerProviderName);

        _resolveError.ShouldBeNull();
        _resolved.ShouldBe(database == "PostgreSQL" ? DatabaseProvider.Postgres : DatabaseProvider.SqlServer);
    }

    [Then(@"^the service stops before it accepts any request$")]
    public void ThenTheServiceStopsBeforeItAcceptsAnyRequest()
    {
        _host.ShouldBeNull("the host was built and would have served requests");
        StartupInvalidOperation().ShouldNotBeNull($"start-up failed with something else: {_startupError}");
        _resolveError.ShouldBeOfType<InvalidOperationException>();
    }

    /// <summary>The spec names the allowed values, not the full message, so each is pinned as a word of it.</summary>
    [Then(@"^the message names ""([^""]+)"" and ""([^""]+)"" as the allowed values$")]
    public void ThenTheMessageNamesAsTheAllowedValues(string first, string second)
    {
        foreach (var message in new[] { StartupInvalidOperation()!.Message, _resolveError!.Message })
        {
            message.ShouldContain(first);
            message.ShouldContain(second);
        }
    }

    [Then(@"^every migration in the list belongs to (PostgreSQL|SQL Server)$")]
    public void ThenEveryMigrationInTheListBelongsTo(string database)
    {
        var expectedAssembly = database == "PostgreSQL" ? "DKNet.Accounts.Infra.Postgres" : "DKNet.Accounts.Infra.MsSql";

        _migrations!.Assembly.GetName().Name.ShouldBe(expectedAssembly);
        _migrations.Migrations.ShouldNotBeEmpty();
        _migrations.Migrations.Values.ShouldAllBe(type => type.Assembly.GetName().Name == expectedAssembly);
    }

    /// <summary>
    /// The host points at a SQL Server that does not exist, so a number taken from the database fails in the SQL
    /// Server client; a number made up in-process (a GUID, a counter) comes back instead.
    /// </summary>
    [Then(@"^the number is taken from the database$")]
    public void ThenTheNumberIsTakenFromTheDatabase()
    {
        _number.ShouldBeNull("the number was made up without asking the database");
        Chain(_numberError).OfType<SqlException>().ShouldNotBeEmpty($"the database was not asked: {_numberError}");
    }

    [Then(@"^the key uniqueness rule does not apply to either posting$")]
    public void ThenTheKeyUniquenessRuleDoesNotApplyToEitherPosting()
    {
        _keyIndex.ShouldNotBeNull();
        _keyIndex.IsUnique.ShouldBeTrue();
        _keyIndex.Properties.Select(p => p.Name).ShouldBe(["CallingSystem", "IdempotencyKey"]);
        _keyIndex.GetFilter().ShouldBe("[IdempotencyKey] IS NOT NULL");
    }

    [Then(@"^no migration is pending$")]
    public async Task ThenNoMigrationIsPending()
    {
        _startupError.ShouldBeNull();
        (await CountCurrenciesAsync()).ShouldBeGreaterThan(0, "the service started without migrating the database");
        (await ReadMigrationHistoryAsync()).ShouldBe(_historyBeforeStart);
    }

    [Then(@"^the response is 409 ""([^""]+)""$")]
    public void ThenTheResponseIs409(string code)
    {
        _problem!.Status.ShouldBe(StatusCodes.Status409Conflict);
        ((ErrorItem[])_problem.Extensions["errors"]!).Single().Code.ShouldBe(code);
    }

    #endregion

    #region Helpers

    private async Task StartHostAsync()
    {
        var sqlServer = string.Equals(_setting, "SqlServer", StringComparison.OrdinalIgnoreCase);
        (_host, _startupError) = await DatabaseSettingApiFactory.StartAsync(
            _setting, sqlServer ? UnreachableSqlServer : UnreachablePostgres);
    }

    private DatabaseSettingApiFactory RequireHost() =>
        _host ?? throw new InvalidOperationException($"The service did not start: {_startupError}");

    private InvalidOperationException? StartupInvalidOperation() =>
        Chain(_startupError).OfType<InvalidOperationException>().FirstOrDefault();

    private static IEnumerable<Exception> Chain(Exception? exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            yield return current;
        }
    }

    private async Task<long> CountCurrenciesAsync()
    {
        await using var connection = new NpgsqlConnection(_scratchConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT COUNT(*) FROM acc.\"Currencies\"", connection);
        return (long)(await command.ExecuteScalarAsync())!;
    }

    private async Task<string[]> ReadMigrationHistoryAsync()
    {
        await using var connection = new NpgsqlConnection(_scratchConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "SELECT \"MigrationId\" FROM migrate.\"CoreDbContext\" ORDER BY \"MigrationId\"", connection);
        var ids = new List<string>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            ids.Add(reader.GetString(0));
        }

        return [.. ids];
    }

    #endregion
}

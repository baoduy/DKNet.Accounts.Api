using Microsoft.EntityFrameworkCore;
using Reqnroll.BoDi;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// Coordinates one-time API host startup and teardown for the full Reqnroll test run.
/// Do not add additional <c>[BeforeTestRun]</c> hooks in feature step files.
/// </summary>
[Binding]
public sealed class ApiHooks(IObjectContainer objectContainer)
{
    private static BddApiFactory _factory = null!;
    private static HttpClient _client = null!;

    /// <summary>The run-shared host, for support-level assertions that need it outside a scenario (e.g. the provider check).</summary>
    public static BddApiFactory Factory => _factory;

    /// <summary>
    /// Starts the PostgreSQL container, applies migrations, boots the shared <see cref="BddApiFactory"/> once
    /// per test run and creates a reusable <see cref="HttpClient"/>.
    /// This hook is static because Reqnroll executes <c>[BeforeTestRun]</c> at assembly level. It blocks
    /// synchronously on the container start/migrate (via <c>GetAwaiter().GetResult()</c>) because this Reqnroll
    /// version does not support an async <c>[BeforeTestRun]</c> hook.
    /// </summary>
    [BeforeTestRun]
    public static void BeforeTestRun()
    {
        _factory = new BddApiFactory();
        _factory.StartDatabaseAsync().GetAwaiter().GetResult();

        // Program.cs binds FeatureOptions eagerly from configuration before WebApplicationFactory's own
        // ConfigureAppConfiguration override ever runs (see BddApiFactory.AddFeatureOverrides) — an
        // environment variable is the one input CreateBuilder itself reads early enough to actually flip
        // RequireAuthorization for this host, the same reason the xUnit AuthOn*ApiFixture variants set it
        // this way instead of through the settings dictionary. CreateClient() below is what triggers the
        // host build, so the env var must still be set around that call, not around the container start.
        Environment.SetEnvironmentVariable("FeatureManagement__RequireAuthorization", "true");
        try
        {
            _client = _factory.CreateClient();
        }
        finally
        {
            Environment.SetEnvironmentVariable("FeatureManagement__RequireAuthorization", null);
        }

        using var scope = _factory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        db.Database.MigrateAsync().GetAwaiter().GetResult();

        var entityType = db.Model.FindEntityType(typeof(AccountGroup))!;
        var schema = entityType.GetSchema() ?? "public";
        var tableName = entityType.GetTableName()!;

        // Proves RemoveAccountGroupNesting.Up() actually ran — not just that the app tolerates a stray
        // physical column (see the compatibility re-add below). A migration whose Up() body were emptied
        // would leave one of these counts at 1, failing every test in the run right here at bootstrap.
        var columnCount = db.Database
            .SqlQueryRaw<int>(
                "SELECT COUNT(*)::int AS \"Value\" FROM information_schema.columns " +
                "WHERE table_schema = {0} AND table_name = {1} AND column_name = 'ParentId'",
                schema, tableName)
            .SingleAsync().GetAwaiter().GetResult();
        columnCount.ShouldBe(0,
            "RemoveAccountGroupNesting migration should have dropped AccountGroups.ParentId");

        var indexCount = db.Database
            .SqlQueryRaw<int>(
                "SELECT COUNT(*)::int AS \"Value\" FROM pg_indexes " +
                "WHERE schemaname = {0} AND tablename = {1} AND indexname = 'IX_AccountGroups_ParentId'",
                schema, tableName)
            .SingleAsync().GetAwaiter().GetResult();
        indexCount.ShouldBe(0,
            "RemoveAccountGroupNesting migration should have dropped IX_AccountGroups_ParentId");

        // DRK-1394 §5's legacy-nesting scenario seeds a row shaped like it looked before the
        // RemoveAccountGroupNesting migration by writing the old "ParentId" column directly
        // (FlatAccountGroupsSteps.SetLegacyParentAsync) — the migration above already dropped it for
        // real, proving the DDL itself applies cleanly (asserted above). Restore it here as a plain,
        // unmapped column so that raw SQL still has somewhere to write; AccountGroup's model never
        // references it again, and every other scenario is driven by the API/DTO shape, not the physical
        // schema, so this has no other effect.
        var table = $"\"{schema}\".\"{tableName}\"";
        db.Database.ExecuteSqlRawAsync(
                $"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS \"ParentId\" uuid NULL")
            .GetAwaiter().GetResult();
    }

    /// <summary>
    /// Disposes the shared <see cref="BddApiFactory"/> and stops the PostgreSQL container once after all
    /// scenarios complete. Keep lifecycle teardown centralized here instead of feature-specific hooks.
    /// </summary>
    [AfterTestRun]
    public static async Task AfterTestRun()
    {
        await _factory.DisposeAsync();
        await _factory.StopDatabaseAsync();
    }

    /// <summary>
    /// Resets scenario data and registers shared dependencies in Reqnroll's <see cref="IObjectContainer"/>.
    /// Any <c>[Binding]</c> class can inject <see cref="HttpClient"/>, <see cref="ScenarioState"/>, and <see cref="BddApiFactory"/>.
    /// To add a new feature, create <c>Features/&lt;Domain&gt;/&lt;Action&gt;.feature</c> and matching
    /// <c>Features/&lt;Domain&gt;/Steps/&lt;Action&gt;Steps.cs</c>; Reqnroll auto-discovers bindings without csproj edits.
    /// </summary>
    [BeforeScenario(Order = 0)]
    public async Task BeforeScenarioAsync()
    {
        await _factory.ResetDatabaseAsync();
        _factory.LogCapture.Clear();
        objectContainer.RegisterInstanceAs<HttpClient>(_client);
        objectContainer.RegisterInstanceAs(_factory);
        objectContainer.RegisterInstanceAs(new ScenarioState());
    }
}

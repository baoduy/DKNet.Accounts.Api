using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SlimMessageBus.Host;
using SlimMessageBus.Host.Memory;
using SlimMessageBus.Host.Serialization.SystemTextJson;
using DKNet.EfCore.AuditLogs;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices;
using DKNet.Accounts.AppServices.Accounts.V1;
using DKNet.Accounts.AppServices.Accounts.V1.Queries;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.Infra.Contexts;
using DKNet.Accounts.Infra.Extensions;
using DKNet.Accounts.Share;
using Testcontainers.PostgreSql;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DomainAccount = DKNet.Accounts.Domains.Features.Accounts.Entities.Account;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// Runs the account read paths (get-by-id, list, get-balance) against a REAL PostgreSQL container instead of
/// the EF Core InMemory provider every other test in this solution runs on. Every entity property in this
/// service that <c>HasConversion&lt;string&gt;()</c> makes a text column stays a plain CLR enum to LINQ, so
/// InMemory's client-side evaluation never notices a translation defect — only a real relational provider
/// does. This is the narrow, targeted coverage `MigrationSchemaTests.EfCoreModel_ShouldTarget_PostgreSqlProvider`
/// implies but nothing previously exercised: it does not convert the BDD/App.Tests fixture (InMemory stays the
/// default for everything else), it drives the same production query handlers the real endpoints call.
/// </summary>
public sealed class AccountReadPathsPostgresTests : IAsyncLifetime
{
    /// <summary>CreatedBy is left for EfCoreAuditHook to stamp on save (DRK-1372 §5); this bare
    /// <c>ServiceCollection</c> is not the ASP.NET host, so there is no <c>IPrincipalProvider</c>/HTTP
    /// credential to resolve it from — a fixed signed-in user stands in for one.</summary>
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
                [$"ConnectionStrings:{SharedConsts.DbConnectionString}"] = _container.GetConnectionString()
            })
            .Build();

        // Mirrors DbContextFactory's design-time provider: AddInfraServices' AddEventPublisher needs an
        // IMessageBus to resolve, satisfied here by the same in-memory-only bus, never a real broker.
        _services = new ServiceCollection()
            .AddSingleton<IConfiguration>(config)
            .AddAppServices()
            .AddInfraServices()
            .AddCurrentUserProvider<CoreDbContext, FixedDataOwnerProvider>()
            .AddSlimMessageBus(mbb => mbb.AddJsonSerializer().AddMemoryBus(typeof(InfraSetup).Assembly))
            .AddLogging()
            .BuildServiceProvider();

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _services.DisposeAsync();
        await _container.DisposeAsync();
    }

    private async Task<Guid> SeedAccountAsync()
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
        var account = new DomainAccount(
            groupId: Guid.NewGuid(),
            accountNumber: $"ACC{Guid.NewGuid():N}"[..13],
            name: "Operating",
            currencyCode: "SGD",
            classification: AccountClassification.Liability,
            permittedToGoNegative: false,
            overdraftLimit: null,
            minimumBalance: null,
            externalReference: null,
            metadata: null);
        db.Add(account);
        await db.SaveChangesAsync();
        return account.Id;
    }

    [Fact]
    public async Task GetById_ProjectsClassificationStatusAndCurrency_AgainstRealPostgres()
    {
        // Row 8 moved to the generic MapGetById<Account, Guid, AccountDto> mapper (DRK-1277 §11/§12), which
        // hides its own specification type — this drives the same repository.FirstOrDefaultAsync<TEntity,
        // TModel> Mapster projection over AccountDto that mapper calls, the thing this test actually guards.
        var id = await SeedAccountAsync();
        using var scope = _services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IRepositorySpec>();

        var dto = await repository.FirstOrDefaultAsync<Account, AccountDto>(
            new SpecGetAccount(byId: id), CancellationToken.None);

        dto.ShouldNotBeNull();
        dto.Classification.ShouldBe(AccountClassification.Liability);
        dto.Status.ShouldBe(AccountStatus.Active);
        dto.Currency.ShouldBe("SGD");
    }

    [Fact]
    public async Task List_ProjectsClassificationStatusAndCurrency_AgainstRealPostgres()
    {
        // Row 7 moved to the generic MapGetList<Account, Guid, AccountDto> mapper (DRK-1277 §11/§12) — same
        // reasoning as GetById above.
        var id = await SeedAccountAsync();
        using var scope = _services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IRepositorySpec>();

        var page = await repository.ToPagedListAsync<Account, AccountDto>(
            new SpecListAccounts(), 1, 20, CancellationToken.None);

        var dto = page.ShouldHaveSingleItem();
        dto.Id.ShouldBe(id);
        dto.Classification.ShouldBe(AccountClassification.Liability);
        dto.Currency.ShouldBe("SGD");
    }

    [Fact]
    public async Task GetBalance_ProjectsCurrency_AgainstRealPostgres()
    {
        var id = await SeedAccountAsync();
        using var scope = _services.CreateScope();
        var handler = new GetAccountBalanceQueryHandler(scope.ServiceProvider.GetRequiredService<IRepositorySpec>());

        var dto = await handler.OnHandle(new GetAccountBalanceQuery { Id = id }, CancellationToken.None);

        dto.ShouldNotBeNull();
        dto.Currency.ShouldBe("SGD");
        dto.Balance.ShouldBe(0m);
    }
}

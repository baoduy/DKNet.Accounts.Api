using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SlimMessageBus.Host;
using SlimMessageBus.Host.Memory;
using SlimMessageBus.Host.Serialization.SystemTextJson;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices;
using DKNet.Accounts.AppServices.Accounts.V1;
using DKNet.Accounts.AppServices.Accounts.V1.Queries;
using DKNet.Accounts.Infra.Contexts;
using DKNet.Accounts.Infra.Extensions;
using DKNet.Accounts.Share;
using Testcontainers.PostgreSql;
using DomainAccount = DKNet.Accounts.Domains.Features.Accounts.Entities.Account;
using DomainAccountClassification = DKNet.Accounts.Domains.Features.Accounts.Entities.AccountClassification;

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
            classification: DomainAccountClassification.Liability,
            permittedToGoNegative: false,
            overdraftLimit: null,
            minimumBalance: null,
            externalReference: null,
            metadata: null,
            byUser: "PayHub");
        db.Add(account);
        await db.SaveChangesAsync();
        return account.Id;
    }

    [Fact]
    public async Task GetById_ProjectsClassificationStatusAndCurrency_AgainstRealPostgres()
    {
        var id = await SeedAccountAsync();
        using var scope = _services.CreateScope();
        var handler = new GetAccountByIdQueryHandler(scope.ServiceProvider.GetRequiredService<IRepositorySpec>());

        var dto = await handler.OnHandle(new GetAccountByIdQuery { Id = id }, CancellationToken.None);

        dto.ShouldNotBeNull();
        dto.Classification.ShouldBe(AccountClassification.Liability);
        dto.Status.ShouldBe(AccountStatus.Active);
        dto.Currency.ShouldBe("SGD");
    }

    [Fact]
    public async Task List_ProjectsClassificationStatusAndCurrency_AgainstRealPostgres()
    {
        var id = await SeedAccountAsync();
        using var scope = _services.CreateScope();
        var handler = new ListAccountsQueryHandler(scope.ServiceProvider.GetRequiredService<IRepositorySpec>());

        var page = await handler.OnHandle(new ListAccountsQuery(), CancellationToken.None);

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

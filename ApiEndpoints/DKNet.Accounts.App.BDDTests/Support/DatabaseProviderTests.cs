using Microsoft.EntityFrameworkCore;
using DKNet.Accounts.Infra.Contexts;
using Shouldly;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// §7 acceptance check: the BDD host's <see cref="CoreDbContext"/> runs on the Npgsql provider, not
/// EF Core InMemory. Goes red if <see cref="BddApiFactory.ConfigureDatabase"/> is ever reverted to
/// <c>UseInMemoryDatabase</c>.
/// </summary>
[TestFixture]
public class DatabaseProviderTests
{
    [Test]
    public void CoreDbContext_UsesNpgsqlProvider_NotInMemory()
    {
        using var scope = ApiHooks.Factory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoreDbContext>();

        db.Database.ProviderName.ShouldBe("Npgsql.EntityFrameworkCore.PostgreSQL");
        db.Database.IsInMemory().ShouldBeFalse();
    }
}

using DKNet.Accounts.AppServices.AccountGroups.V1.Specs;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.App.Tests.Unit.Specs;

/// <summary>
/// §3 row 7: each of <see cref="SpecListAccountGroups"/>'s filters must work independently, not only in
/// combination — one group per filter, plus the no-filter fallback.
/// </summary>
public class SpecListAccountGroupsTests
{
    private static AccountGroup NewGroup(
        string code, AccountGroupType type = AccountGroupType.Customer, Guid? parentId = null) => new(
        code: code,
        name: code,
        description: null,
        type: type,
        ownerId: "PayHub",
        parentId: parentId,
        metadata: null);

    private static bool Matches(SpecListAccountGroups spec, AccountGroup group) =>
        spec.FilterQuery!.Compile().Invoke(group);

    [Fact]
    public void ParentIdFilter_MatchesOnlyThatParent()
    {
        var parentId = Guid.NewGuid();
        var child = NewGroup("CHI", parentId: parentId);
        var unrelated = NewGroup("OTHER", parentId: Guid.NewGuid());

        var spec = new SpecListAccountGroups(parentId: parentId);

        Matches(spec, child).ShouldBeTrue();
        Matches(spec, unrelated).ShouldBeFalse();
    }

    [Fact]
    public void CodeFilter_MatchesOnlyThatCode()
    {
        var target = NewGroup("MATCH");
        var other = NewGroup("OTHER");

        var spec = new SpecListAccountGroups(code: "MATCH");

        Matches(spec, target).ShouldBeTrue();
        Matches(spec, other).ShouldBeFalse();
    }

    [Fact]
    public void NoFilters_MatchesEverything()
    {
        var spec = new SpecListAccountGroups();

        Matches(spec, NewGroup("ANY")).ShouldBeTrue();
    }
}

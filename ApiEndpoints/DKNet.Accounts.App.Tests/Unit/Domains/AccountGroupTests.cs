using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.App.Tests.Unit.Domains;

public class AccountGroupTests
{
    private static AccountGroup NewGroup() => new(
        code: "CUST1",
        name: "Acme",
        description: "desc",
        type: AccountGroupType.Customer,
        ownerId: "PayHub",
        metadata: new Dictionary<string, string> { ["k"] = "v" });

    [Fact]
    public void NewGroup_IsActiveWithTheGivenFields()
    {
        var group = NewGroup();

        group.Code.ShouldBe("CUST1");
        group.Name.ShouldBe("Acme");
        group.Description.ShouldBe("desc");
        group.Type.ShouldBe(AccountGroupType.Customer);
        group.OwnerId.ShouldBe("PayHub");
        group.Metadata.ShouldNotBeNull();
        group.Status.ShouldBe(AccountGroupStatus.Active);
    }

    [Fact]
    public void NewGroup_LeavesCreatedByUnset_ForDataOwnerHookToStampOnSave()
    {
        // DRK-1277 C3/§11/§12: the [CrudCreate]-attributed constructor takes no acting-user parameter, so a
        // generated request can never carry one. CreatedBy is left unset here and stamped on save by
        // DataOwnerHook/PrincipalProvider instead — never assigned in-process.
        var group = NewGroup();

        group.CreatedBy.ShouldBeNullOrEmpty();
    }

    [Fact]
    public void Update_AppliesEveryMemberSupplied()
    {
        var group = NewGroup();
        var metadata = new Dictionary<string, string> { ["region"] = "SG" };

        group.Update("New Name", "New desc", metadata);

        group.Name.ShouldBe("New Name");
        group.Description.ShouldBe("New desc");
        group.Metadata.ShouldBe(metadata);
    }

    [Fact]
    public void Update_LeavesANullMemberAlone()
    {
        // Partial update: null means "not supplied", never "clear it" — no field can be cleared through this
        // route, which is why UpdateAccountGroupRequestValidator refuses a body with every member null.
        var group = NewGroup();

        group.Update(name: "Only the name", description: null, metadata: null);

        group.Name.ShouldBe("Only the name");
        group.Description.ShouldBe("desc");
        group.Metadata!["k"].ShouldBe("v");
    }

    [Fact]
    public void Close_SetsClosedStatus()
    {
        var group = NewGroup();

        group.Close();

        group.Status.ShouldBe(AccountGroupStatus.Closed);
    }

    [Fact]
    public void Close_LeavesUpdatedByUnset_ForDataOwnerHookToStampOnSave()
    {
        var group = NewGroup();

        group.Close();

        group.UpdatedBy.ShouldBeNullOrEmpty();
    }

    [Fact]
    public void Activate_ReopensAClosedGroup()
    {
        var group = NewGroup();
        group.Close();

        group.Activate();

        group.Status.ShouldBe(AccountGroupStatus.Active);
    }

    [Fact]
    public void Activate_LeavesUpdatedByUnset_ForDataOwnerHookToStampOnSave()
    {
        var group = NewGroup();
        group.Close();

        group.Activate();

        group.UpdatedBy.ShouldBeNullOrEmpty();
    }
}

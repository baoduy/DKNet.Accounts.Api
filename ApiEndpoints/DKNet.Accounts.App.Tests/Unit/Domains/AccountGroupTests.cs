using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.App.Tests.Unit.Domains;

public class AccountGroupTests
{
    private static AccountGroup NewGroup(Guid? parentId = null) => new(
        code: "CUST-000123",
        name: "Acme",
        description: "desc",
        type: AccountGroupType.Customer,
        ownerId: "PayHub",
        parentId: parentId,
        metadata: new Dictionary<string, string> { ["k"] = "v" });

    [Fact]
    public void NewGroup_IsActiveWithTheGivenFields()
    {
        var group = NewGroup();

        group.Code.ShouldBe("CUST-000123");
        group.Name.ShouldBe("Acme");
        group.Description.ShouldBe("desc");
        group.Type.ShouldBe(AccountGroupType.Customer);
        group.OwnerId.ShouldBe("PayHub");
        group.ParentId.ShouldBeNull();
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
    public void Rename_ChangesName()
    {
        var group = NewGroup();

        group.Rename("New Name");

        group.Name.ShouldBe("New Name");
    }

    [Fact]
    public void ChangeDescription_AcceptsNullToClearIt()
    {
        var group = NewGroup();

        group.ChangeDescription(null);

        group.Description.ShouldBeNull();
    }

    [Fact]
    public void ChangeMetadata_ReplacesTheBag()
    {
        var group = NewGroup();
        var metadata = new Dictionary<string, string> { ["region"] = "SG" };

        group.ChangeMetadata(metadata);

        group.Metadata.ShouldBe(metadata);
    }

    [Fact]
    public void Reparent_OnlyAssigns_LeavingCycleDetectionToTheCaller()
    {
        var group = NewGroup();
        var newParentId = Guid.NewGuid();

        group.Reparent(newParentId, "PayHub");

        group.ParentId.ShouldBe(newParentId);
    }

    [Fact]
    public void Reparent_AcceptsNullToClearTheParent()
    {
        var group = NewGroup(parentId: Guid.NewGuid());

        group.Reparent(null, "PayHub");

        group.ParentId.ShouldBeNull();
    }

    [Fact]
    public void Close_SetsClosedStatus()
    {
        var group = NewGroup();

        group.Close("PayHub");

        group.Status.ShouldBe(AccountGroupStatus.Closed);
    }

    [Fact]
    public void Activate_ReopensAClosedGroup()
    {
        var group = NewGroup();
        group.Close("PayHub");

        group.Activate("PayHub");

        group.Status.ShouldBe(AccountGroupStatus.Active);
    }
}

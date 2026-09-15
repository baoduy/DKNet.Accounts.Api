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
    public void NewGroup_LeavesCreatedByUnset_UntilStampCreatedByIsCalled()
    {
        // DRK-1277 C3: the [CrudCreate]-attributed constructor takes no acting-user parameter, so a
        // generated request can never carry one. The create handler stamps it explicitly afterwards, from
        // the trusted calling-system identity — never from DataOwnerHook, which resolves a human principal
        // this machine-to-machine API never has (see AccountGroup.StampCreatedBy).
        var group = NewGroup();

        group.CreatedBy.ShouldBeNullOrEmpty();

        group.StampCreatedBy("treasury-ops");

        group.CreatedBy.ShouldBe("treasury-ops");
    }

    [Fact]
    public void Rename_ChangesNameAndStampsUpdatedBy()
    {
        var group = NewGroup();

        group.Rename("New Name", "LedgerSync");

        group.Name.ShouldBe("New Name");
        group.LastModifiedBy.ShouldBe("LedgerSync");
    }

    [Fact]
    public void ChangeDescription_AcceptsNullToClearIt()
    {
        var group = NewGroup();

        group.ChangeDescription(null, "PayHub");

        group.Description.ShouldBeNull();
    }

    [Fact]
    public void ChangeMetadata_ReplacesTheBag()
    {
        var group = NewGroup();
        var metadata = new Dictionary<string, string> { ["region"] = "SG" };

        group.ChangeMetadata(metadata, "PayHub");

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

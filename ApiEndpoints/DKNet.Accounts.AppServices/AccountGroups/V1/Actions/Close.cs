using Microsoft.EntityFrameworkCore;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.AppServices.AccountGroups.V1.Specs;
using DKNet.Accounts.AppServices.Crud;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

// CloseAccountGroupRequest is generated from AccountGroup.Close's [CrudAction] (DRK-1418 §3 row 1); the
// route now rides the generated composite too (DRK-1522 §3 row 11) since the refusal below runs as a
// command failure, not a validator failure — the only hand-written piece left is this handler, which
// replaces the generated one (its header names this as the seam).

/// <summary>
/// Refuses to close a group while any account it holds still carries a balance (DRK-1418 §3 row 5, R4: a
/// held amount counts as money held even though every <c>HeldAmount</c> is 0 today; DRK-1522 §3 row 9: the
/// refusal now carries <see cref="LedgerErrors.GroupHoldsBalance"/> as a command failure).
/// </summary>
internal sealed class CloseAccountGroupHandler(
    IRepositorySpec repository,
    IMapper mapper)
    : Fluents.Requests.IHandler<CloseAccountGroupRequest, AccountGroupDto>
{
    public async Task<IResult<AccountGroupDto>> OnHandle(CloseAccountGroupRequest request, CancellationToken cancellationToken)
    {
        var entity = await repository.FirstOrDefaultAsync(new SpecGetAccountGroup(byId: request.Id), cancellationToken);
        if (entity is null)
        {
            return Result.Fail<AccountGroupDto>(new NotFoundError($"AccountGroup '{request.Id}' was not found."));
        }

        var holdsBalance = await repository.Query(new SpecListAccounts(groupId: request.Id))
            .AnyAsync(a => a.Balance != 0m || a.HeldAmount != 0m, cancellationToken);
        if (holdsBalance)
        {
            return Result.Fail<AccountGroupDto>(LedgerErrors.Error(
                LedgerErrors.GroupHoldsBalance,
                "Cannot close a group while any account it holds still carries a balance."));
        }

        entity.Close();
        return Result.Ok(mapper.Map<AccountGroupDto>(entity));
    }
}

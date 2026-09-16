using Microsoft.EntityFrameworkCore;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.AppServices.Crud;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

// CloseAccountGroupRequest and its handler are generated from AccountGroup.Close's [CrudAction] (DRK-1418
// §3 row 1). The route stays hand-mapped (AccountGroupsV1Endpoint, §3 row 8 deviation) rather than the
// generated composite's MapActionById: that overload binds its command from the JSON body only and requires
// one (400 on the empty body every close/activate call sends, since there is nothing left to send once the
// id comes from the route) — the hand-mapped route below constructs the request from the route id alone,
// then runs this validator explicitly before dispatch, since FluentValidation's endpoint auto-validation
// only inspects arguments already bound to the delegate and would otherwise never see a request built
// after binding completes. Only the business-rule refusal below is hand-written.

/// <summary>
/// Refuses to close a group while any account it holds still carries a balance (DRK-1418 §3 row 5, R4: a
/// held amount counts as money held even though every <c>HeldAmount</c> is 0 today).
/// </summary>
internal sealed class CloseAccountGroupRequestValidator : AbstractValidator<CloseAccountGroupRequest>
{
    public CloseAccountGroupRequestValidator(IRepositorySpec repository)
    {
        RuleFor(r => r.Id)
            .MustAsync(async (id, ct) => !await repository.Query(new SpecListAccounts(groupId: id))
                .AnyAsync(a => a.Balance != 0m || a.HeldAmount != 0m, ct))
            .WithErrorCode(LedgerErrors.GroupHoldsBalance)
            .WithMessage("Cannot close a group while any account it holds still carries a balance.");
    }
}

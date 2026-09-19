using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.AppServices.Crud;
using Microsoft.EntityFrameworkCore;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

// DeleteAccountGroupRequest is generated (baseline, IWithKey<Guid>) — the generated MapDeleteById route has no
// hand-written handler to attach the GROUP_NOT_EMPTY refusal to (R2), so this file holds the validator ONLY.
// The rule refuses on the existence of any account in the group (R3: no Status/Balance/HeldAmount predicate) —
// an unknown group holds no accounts, so it trivially passes and lets the mapper answer 404 (R4).
internal sealed class DeleteAccountGroupRequestValidator : AbstractValidator<DeleteAccountGroupRequest>
{
    public DeleteAccountGroupRequestValidator(IRepositorySpec repository) =>
        RuleFor(r => r.Id)
            .MustAsync(async (id, ct) => !await repository.Query(new SpecListAccounts(groupId: id)).AnyAsync(ct))
            .WithErrorCode(LedgerErrors.GroupNotEmpty);
}

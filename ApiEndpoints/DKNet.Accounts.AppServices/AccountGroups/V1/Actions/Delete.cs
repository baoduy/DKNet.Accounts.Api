using DKNet.Accounts.AppServices.Crud;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

// DeleteAccountGroupRequest is generated (baseline, IWithKey<Guid>) — the generated MapDeleteById route has no
// hand-written handler to attach the GROUP_NOT_EMPTY refusal to (R2), so this file holds the validator ONLY.
// Acceptance-tests stage (DRK-1421): stubbed to always pass, not throw NotImplementedException — a throwing
// rule is invoked (and its exception propagates as 500) BEFORE SharpGrip's own model-binding-failure check
// ever runs, which masked the framework's real 400 for a malformed id behind a false "not implemented" 500.
// An always-pass rule already satisfies R4 for real (an unknown id trivially holds no accounts) and leaves
// exactly the three "holds an account" scenarios red — for a real, nameable assertion (422 expected, 204
// observed) — until Build wires the real repository.Query(new SpecListAccounts(groupId: id)).AnyAsync(ct)
// check (§3 row 2).
internal sealed class DeleteAccountGroupRequestValidator : AbstractValidator<DeleteAccountGroupRequest>
{
    public DeleteAccountGroupRequestValidator() =>
        RuleFor(r => r.Id)
            .MustAsync((_, _) => Task.FromResult(true))
            .WithErrorCode(LedgerErrors.GroupNotEmpty);
}

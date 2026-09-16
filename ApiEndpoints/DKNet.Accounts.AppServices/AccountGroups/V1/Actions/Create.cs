using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.AccountGroups.V1.Specs;
using DKNet.Accounts.AppServices.Crud;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

// CreateAccountGroupRequest is generated from AccountGroup's [CrudCreate] constructor (DRK-1277 §3 row 1) —
// same shape as the hand-written record this replaced (Code, Name, Description, Type, OwnerId, Metadata).
// The duplicate-code refusal moved here from a hand-written handler (DRK-1418 §3 row 2/row 4): with no
// hand-written IHandler left to match by request-type name, the generated CreateAccountGroupHandler now
// runs, backed by the group code's own unique index as a concurrency backstop (surfaced as 409 by
// GlobalExceptionHandler if the race is actually lost, §3 row 3 of DRK-1418).

internal sealed class CreateAccountGroupCommandValidator : AbstractValidator<CreateAccountGroupRequest>
{
    public CreateAccountGroupCommandValidator(IRepositorySpec repository)
    {
        // Cascade(Stop): the duplicate-code lookup only runs once the shape rules on Code pass (R2) — an
        // empty or over-length code never touches the database.
        RuleFor(r => r.Code)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .MaximumLength(50)
            .MustAsync(async (code, ct) => !await repository.AnyAsync(new SpecGetAccountGroup(byCode: code), ct))
            .WithErrorCode(LedgerErrors.DuplicateGroupCode)
            .WithMessage(r => $"A group with code '{r.Code}' already exists.");
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.OwnerId).NotEmpty().MaximumLength(100);
        RuleFor(r => r.Type).IsInEnum();
    }
}

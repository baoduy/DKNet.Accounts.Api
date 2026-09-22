using DKNet.Accounts.AppServices.Crud;

namespace DKNet.Accounts.AppServices.Accounts.V1.Actions;

// ChangeDetailsAccountRequest is generated from Account.ChangeDetails' [CrudUpdate] — one partial-update
// route (PUT {id}) replacing the former rename / change-metadata pair. The generated handler is kept; only
// this validator is hand-written, because a null member means "leave it alone" and a body with every member
// null would otherwise be answered 200 having changed nothing. Status, overdraft limit and minimum balance
// stay on the hand-written PATCH {id} route (Update.cs) — they carry refusal rules a generated handler
// cannot express.

internal sealed class ChangeDetailsAccountRequestValidator : AbstractValidator<ChangeDetailsAccountRequest>
{
    public ChangeDetailsAccountRequestValidator()
    {
        // On the request itself, not a single member: the rule is about the set. 400, not 409 — an empty body
        // is a malformed request, not a stored-state precondition, so it carries no LedgerErrors code.
        RuleFor(r => r)
            .Must(r => r.Name is not null || r.Metadata is not null)
            .OverridePropertyName(string.Empty)
            .WithMessage("Supply at least one of 'name' or 'metadata'.");

        // Only when supplied: a null name is "not supplied", which the rule above already covers.
        RuleFor(r => r.Name!).NotEmpty().MaximumLength(200).When(r => r.Name is not null);
    }
}

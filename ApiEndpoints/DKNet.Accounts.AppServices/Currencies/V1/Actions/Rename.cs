using DKNet.Accounts.AppServices.Crud;

namespace DKNet.Accounts.AppServices.Currencies.V1.Actions;

// RenameCurrencyRequest is generated from Currency.Rename's [CrudUpdate]. Forwarded DataAnnotations are
// NOT enforced on a generated route, so this validator is the only real guard on Name.
internal sealed class RenameCurrencyRequestValidator : AbstractValidator<RenameCurrencyRequest>
{
    public RenameCurrencyRequestValidator() =>
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
}

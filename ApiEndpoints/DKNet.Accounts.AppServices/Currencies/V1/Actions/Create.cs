using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Currencies.V1.Specs;
using DKNet.Accounts.AppServices.Crud;

namespace DKNet.Accounts.AppServices.Currencies.V1.Actions;

// CreateCurrencyRequest is generated from Currency's [CrudCreate] constructor. Forwarded DataAnnotations
// are NOT enforced on a generated route, so this validator is the only real guard on Code/Name/DecimalPlaces.
internal sealed class CreateCurrencyCommandValidator : AbstractValidator<CreateCurrencyRequest>
{
    public CreateCurrencyCommandValidator(IRepositorySpec repository)
    {
        // Cascade(Stop): the duplicate-code lookup only runs once the shape rule on Code passes — an
        // empty or malformed code never touches the database. Compared UPPERCASED so "sgd" collides with
        // "SGD" (the ctor uppercases whatever the caller sends).
        RuleFor(r => r.Code)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Matches("^[A-Za-z]{3}$")
            .MustAsync(async (code, ct) => !await repository.AnyAsync(
                new SpecGetCurrency(byCode: code.ToUpperInvariant()), ct))
            .WithErrorCode(LedgerErrors.DuplicateCurrencyCode)
            .WithMessage(r => $"A currency with code '{r.Code}' already exists.");
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        // ISO-4217 tops out at 4 decimal places.
        RuleFor(r => r.DecimalPlaces).InclusiveBetween(0, 4);
    }
}

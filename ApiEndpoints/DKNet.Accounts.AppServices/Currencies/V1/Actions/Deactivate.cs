using Microsoft.EntityFrameworkCore;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.AppServices.Currencies.V1.Specs;
using DKNet.Accounts.AppServices.Crud;

namespace DKNet.Accounts.AppServices.Currencies.V1.Actions;

// DeactivateCurrencyRequest is generated from Currency.Deactivate's [CrudAction]; the route rides the
// generated composite (MapCurrencyCrud) too — the only hand-written piece is this handler, which replaces
// the generated one, mirroring AccountGroups/V1/Actions/Close.cs's CloseAccountGroupHandler.

/// <summary>
/// Refuses to deactivate a currency while any account denominated in it still holds a non-zero balance
/// (DRK-1659 §5 surface 3, R3: a cross-aggregate check belongs in the handler, never the entity).
/// </summary>
internal sealed class DeactivateCurrencyHandler(
    IRepositorySpec repository,
    IMapper mapper)
    : Fluents.Requests.IHandler<DeactivateCurrencyRequest, CurrencyDto>
{
    public async Task<IResult<CurrencyDto>> OnHandle(DeactivateCurrencyRequest request, CancellationToken cancellationToken)
    {
        var entity = await repository.FirstOrDefaultAsync(new SpecGetCurrency(byId: request.Id), cancellationToken);
        if (entity is null)
        {
            return Result.Fail<CurrencyDto>(new NotFoundError($"Currency '{request.Id}' was not found."));
        }

        var holdsBalance = await repository.Query(new SpecListAccounts(currency: entity.Code))
            .AnyAsync(a => a.Balance != 0m || a.HeldAmount != 0m, cancellationToken);
        if (holdsBalance)
        {
            return Result.Fail<CurrencyDto>(LedgerErrors.Error(
                LedgerErrors.CurrencyHoldsBalance,
                "Cannot deactivate a currency while an account denominated in it still holds a balance."));
        }

        entity.Deactivate();
        return Result.Ok(mapper.Map<CurrencyDto>(entity));
    }
}

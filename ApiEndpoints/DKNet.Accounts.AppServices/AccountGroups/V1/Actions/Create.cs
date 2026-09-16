using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.AccountGroups.V1.Specs;
using DKNet.Accounts.AppServices.Crud;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.AppServices.AccountGroups.V1.Actions;

// CreateAccountGroupRequest is generated from AccountGroup's [CrudCreate] constructor (DRK-1277 §3 row 1) —
// same shape as the hand-written record this replaced (Code, Name, Description, Type, OwnerId, ParentId,
// Metadata). This handler is registered as its hand-written IHandler, matched by request-type name, so the
// generated handler is skipped in favour of the duplicate-code pre-check below.

internal sealed class CreateAccountGroupCommandValidator : AbstractValidator<CreateAccountGroupRequest>
{
    public CreateAccountGroupCommandValidator()
    {
        RuleFor(r => r.Code).NotEmpty().MaximumLength(50);
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.OwnerId).NotEmpty().MaximumLength(100);
        RuleFor(r => r.Type).IsInEnum();
    }
}

/// <summary>
/// Creates a new account group (§3 row 3). The unique-code check is a read-then-write pre-check — acceptable
/// here (only the account-number generator is required to rely on the DB index alone, §3 row 5) — backed by
/// the group code's own unique index as a concurrency backstop (surfaced as 409 by
/// <see cref="Api.Configs.GlobalExceptions.GlobalExceptionHandler"/> if the race is actually lost).
/// </summary>
internal sealed class CreateAccountGroupCommandHandler(
    IRepositorySpec repository,
    IMapper mapper,
    ICallingSystemAccessor callingSystem)
    : Fluents.Requests.IHandler<CreateAccountGroupRequest, AccountGroupDto>
{
    public async Task<IResult<AccountGroupDto>> OnHandle(
        CreateAccountGroupRequest request,
        CancellationToken cancellationToken)
    {
        var callingSystemId = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(callingSystemId))
        {
            return Result.Fail<AccountGroupDto>("The caller is not authenticated.");
        }

        if (await repository.AnyAsync(new SpecGetAccountGroup(byCode: request.Code), cancellationToken))
        {
            return Result.Fail<AccountGroupDto>(LedgerErrors.Error(
                LedgerErrors.DuplicateGroupCode, $"A group with code '{request.Code}' already exists."));
        }

        var group = new AccountGroup(
            request.Code,
            request.Name,
            request.Description,
            request.Type,
            request.OwnerId,
            request.ParentId,
            request.Metadata);

        // CreatedBy is left unset by the constructor and stamped on save by DataOwnerHook/PrincipalProvider
        // (DRK-1277 §11/§12) — not here.
        await repository.AddAsync(group, cancellationToken);

        // Lazy mapping — resolves AFTER SaveChanges, so generated/audit fields are populated.
        return mapper.ResultOf<AccountGroupDto>(group);
    }
}

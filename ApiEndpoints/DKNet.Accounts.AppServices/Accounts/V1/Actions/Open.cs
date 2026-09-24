using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.AccountGroups.V1.Specs;
using DKNet.Accounts.AppServices.Currencies.V1.Specs;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using Microsoft.EntityFrameworkCore;

namespace DKNet.Accounts.AppServices.Accounts.V1.Actions;

/// <summary>
/// Opening an account permitted to go negative with no overdraft limit is refused (an account must always
/// have a determinate floor).
/// </summary>
public sealed record OpenAccountRequest : Fluents.Requests.IWitResponse<AccountDto>
{
    public Guid GroupId { get; set; }

    /// <summary>
    /// Optional caller-chosen suffix, 3-10 characters. The stored <c>AccountNumber</c> is always
    /// <c>{group code}-{this}</c> — the caller never supplies the prefix and cannot override it. Omitted,
    /// a 10-digit value is generated from the account-number sequence.
    /// </summary>
    public string? AccountNumber { get; set; }

    public string Name { get; set; } = null!;

    public string Currency { get; set; } = null!;

    public AccountClassification Classification { get; set; }

    public bool PermittedToGoNegative { get; set; }

    public decimal? OverdraftLimit { get; set; }

    public decimal? MinimumBalance { get; set; }

    public string? ExternalReference { get; set; }

    public IReadOnlyDictionary<string, string>? Metadata { get; set; }
}

internal sealed class OpenAccountCommandValidator : AbstractValidator<OpenAccountRequest>
{
    public OpenAccountCommandValidator(IRepositorySpec repository)
    {
        // Only the suffix is validated here — the group-code prefix is composed by the handler, which is
        // also where the group is read, so its length is already guaranteed by the group's own 3-5 rule.
        RuleFor(r => r.AccountNumber)
            .Length(3, 10)
            .When(r => !string.IsNullOrEmpty(r.AccountNumber));
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.Currency).NotEmpty().Length(3, 10);
        RuleFor(r => r.Classification).IsInEnum();
        RuleFor(r => r.OverdraftLimit).LedgerLimit(DecimalPlacesOf);
        RuleFor(r => r.MinimumBalance).LedgerLimit(DecimalPlacesOf);
        return;

        async Task<int?> DecimalPlacesOf(OpenAccountRequest request, CancellationToken ct) =>
            string.IsNullOrEmpty(request.Currency)
                ? null
                : await repository.Query(new SpecGetCurrency(byCode: request.Currency.ToUpperInvariant()))
                    .Select(c => (int?)c.DecimalPlaces)
                    .FirstOrDefaultAsync(ct);
    }
}

internal sealed class OpenAccountCommandHandler(
    IRepositorySpec repository,
    IMapper mapper,
    IAccountNumberGenerator accountNumbers,
    ICallingSystemAccessor callingSystem)
    : Fluents.Requests.IHandler<OpenAccountRequest, AccountDto>
{
    public async Task<IResult<AccountDto>> OnHandle(OpenAccountRequest request, CancellationToken cancellationToken)
    {
        var callingSystemId = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(callingSystemId))
        {
            return Result.Fail<AccountDto>("The caller is not authenticated.");
        }

        var currencyCode = request.Currency.ToUpperInvariant();
        var currency = await repository.FirstOrDefaultAsync(new SpecGetCurrency(byCode: currencyCode), cancellationToken);
        if (currency is null)
        {
            return Result.Fail<AccountDto>(LedgerErrors.Error(
                LedgerErrors.UnsupportedCurrency, $"'{request.Currency}' is not a supported currency."));
        }

        if (!currency.IsActive)
        {
            return Result.Fail<AccountDto>(LedgerErrors.Error(
                LedgerErrors.UnsupportedCurrency, $"'{request.Currency}' is not currently offered."));
        }

        if (AccountFloorPolicy.RequiresOverdraftLimit(request.PermittedToGoNegative, request.OverdraftLimit))
        {
            return Result.Fail<AccountDto>(LedgerErrors.Error(
                LedgerErrors.OverdraftLimitRequired,
                "An account permitted to go negative must state its overdraft limit."));
        }

        // The group IS read now, unlike earlier stages: an account number is {group code}-{suffix}, so the
        // group's code is an input to opening and an account can no longer be opened against a fabricated
        // group id. Still a cross-aggregate reference by id only (DKNET-AGG-004) — read, never navigated.
        // Deliberately below the currency and floor checks: a caller's own malformed request is refused on
        // its own terms first, so a missing group never masks the reason the request was really wrong.
        var group = await repository.FirstOrDefaultAsync(
            new SpecGetAccountGroup(byId: request.GroupId), cancellationToken);
        if (group is null)
        {
            return Result.Fail<AccountDto>(new NotFoundError($"AccountGroup '{request.GroupId}' was not found."));
        }

        // The caller only ever chooses the suffix; the group code prefix is ours, so a caller can never mint
        // a number claiming a group it did not open into. Account uppercases what it stores. Collisions fall
        // to the unique index on AccountNumber, which the error-response mapping already surfaces as 409.
        var suffix = string.IsNullOrEmpty(request.AccountNumber)
            ? await accountNumbers.NextValueAsync()
            : request.AccountNumber;
        var accountNumber = $"{group.Code}-{suffix}";

        var account = new Account(
            request.GroupId,
            accountNumber,
            request.Name,
            currency.Code,
            request.Classification,
            request.PermittedToGoNegative,
            request.OverdraftLimit,
            request.MinimumBalance,
            request.ExternalReference,
            request.Metadata);

        await repository.AddAsync(account, cancellationToken);

        // Lazy mapping — resolves AFTER SaveChanges, so generated/audit fields are populated.
        return mapper.ResultOf<AccountDto>(account);
    }
}

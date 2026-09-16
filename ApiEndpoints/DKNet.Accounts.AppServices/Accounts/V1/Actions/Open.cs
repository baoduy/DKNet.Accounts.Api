using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Share;

namespace DKNet.Accounts.AppServices.Accounts.V1.Actions;

/// <summary>
/// Opening an account permitted to go negative with no overdraft limit is refused (an account must always
/// have a determinate floor).
/// </summary>
public sealed record OpenAccountRequest : Fluents.Requests.IWitResponse<AccountDto>
{
    public Guid GroupId { get; set; }

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
    public OpenAccountCommandValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.Currency).NotEmpty().Length(3);
        RuleFor(r => r.Classification).IsInEnum();
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

        var currency = Currency.All.FirstOrDefault(c => c.Code == request.Currency);
        if (currency is null)
        {
            return Result.Fail<AccountDto>(LedgerErrors.Error(
                LedgerErrors.UnsupportedCurrency, $"'{request.Currency}' is not a supported currency."));
        }

        // ponytail: no group-existence check here — GroupId is a cross-aggregate reference by id only
        // (DKNET-AGG-004), §3 names no "group must exist" rule for Open, and the frozen acceptance tests open
        // accounts against a fabricated group id in scenarios that aren't about groups at all (e.g. "An
        // account reports its available balance as its current balance"). Add a lookup guard here if a future
        // stage needs opening-into-a-real-group enforced.
        if (AccountFloorPolicy.RequiresOverdraftLimit(request.PermittedToGoNegative, request.OverdraftLimit))
        {
            return Result.Fail<AccountDto>(LedgerErrors.Error(
                LedgerErrors.OverdraftLimitRequired,
                "An account permitted to go negative must state its overdraft limit."));
        }

        var accountNumber = await accountNumbers.NextValueAsync();

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

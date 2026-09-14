using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.AppServices.Accounts.V1.Queries;

public sealed record GetAccountBalanceQuery : Fluents.Queries.IWitResponse<AccountBalanceDto>
{
    public required Guid Id { get; init; }
}

/// <summary><see cref="AccountBalanceDto.Balance"/> is the account's real, postings-driven running total.
/// R8: <see cref="AccountBalanceDto.AvailableBalance"/> always equals it and
/// <see cref="AccountBalanceDto.HeldAmount"/> is always 0 — no hold mechanism exists yet.</summary>
internal sealed class GetAccountBalanceQueryHandler(IRepositorySpec repository)
    : Fluents.Queries.IHandler<GetAccountBalanceQuery, AccountBalanceDto>
{
    public Task<AccountBalanceDto?> OnHandle(GetAccountBalanceQuery request, CancellationToken cancellationToken) =>
        repository.FirstOrDefaultAsync<Account, AccountBalanceDto>(
            new SpecGetAccount(request.Id), cancellationToken);
}

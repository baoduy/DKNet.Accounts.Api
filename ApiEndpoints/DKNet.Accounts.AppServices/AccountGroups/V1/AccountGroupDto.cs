using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.AppServices.AccountGroups.V1;

public sealed record AccountGroupDto
{
    public Guid Id { get; init; }

    public string Code { get; init; } = null!;

    public string Name { get; init; } = null!;

    public string? Description { get; init; }

    public AccountGroupType Type { get; init; }

    public AccountGroupStatus Status { get; init; }

    public string OwnerId { get; init; } = null!;

    public Guid? ParentId { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }
}

/// <summary>
/// One line per currency (R: balances across different currencies are never summed together).
/// </summary>
public sealed record AccountGroupBalanceLineDto
{
    public string Currency { get; init; } = null!;

    public decimal Balance { get; init; }
}

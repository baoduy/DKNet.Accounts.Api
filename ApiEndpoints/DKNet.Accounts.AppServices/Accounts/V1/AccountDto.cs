using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.AppServices.Accounts.V1;

public sealed record AccountDto
{
    public Guid Id { get; init; }

    public string AccountNumber { get; init; } = null!;

    public Guid GroupId { get; init; }

    public string Name { get; init; } = null!;

    public string Currency { get; init; } = null!;

    public AccountClassification Classification { get; init; }

    public AccountStatus Status { get; init; }

    public decimal Balance { get; init; }

    public decimal AvailableBalance { get; init; }

    public decimal HeldAmount { get; init; }

    public decimal? OverdraftLimit { get; init; }

    public decimal? MinimumBalance { get; init; }

    public bool PermittedToGoNegative { get; init; }

    public long StreamPosition { get; init; }

    public DateTimeOffset? LastPostedOn { get; init; }

    public string? ExternalReference { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }

    public DateTimeOffset OpenedOn { get; init; }

    public DateTimeOffset? ClosedOn { get; init; }
}

public sealed record AccountBalanceDto
{
    public string Currency { get; init; } = null!;

    public decimal Balance { get; init; }

    public decimal AvailableBalance { get; init; }

    public decimal HeldAmount { get; init; }
}

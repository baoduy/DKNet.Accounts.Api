namespace DKNet.Accounts.Client.Contracts;

/// <summary>Mirrors the service's <c>OpenAccountRequest</c>.</summary>
public sealed record OpenAccountRequest
{
    public required Guid GroupId { get; init; }

    /// <summary>Optional caller-chosen suffix, 3-10 characters. Omitted, the service generates one.</summary>
    public string? AccountNumber { get; init; }

    public required string Name { get; init; }

    public required string Currency { get; init; }

    public required AccountClassification Classification { get; init; }

    public bool PermittedToGoNegative { get; init; }

    public decimal? OverdraftLimit { get; init; }

    public decimal? MinimumBalance { get; init; }

    public string? ExternalReference { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }
}

/// <summary>Mirrors the service's <c>AccountDto</c>.</summary>
public sealed record AccountDto
{
    public required Guid Id { get; init; }

    public required Guid GroupId { get; init; }

    public required string AccountNumber { get; init; }

    public required string Name { get; init; }

    public required string Currency { get; init; }

    public required AccountClassification Classification { get; init; }

    public required AccountStatus Status { get; init; }

    public decimal Balance { get; init; }

    public decimal HeldAmount { get; init; }

    public required decimal AvailableBalance { get; init; }

    public decimal? OverdraftLimit { get; init; }

    public decimal? MinimumBalance { get; init; }

    public bool PermittedToGoNegative { get; init; }

    public long StreamPosition { get; init; }

    public DateTimeOffset? LastPostedOn { get; init; }

    public string? ExternalReference { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }

    public required DateTimeOffset OpenedOn { get; init; }

    public DateTimeOffset? ClosedOn { get; init; }
}

/// <summary>Mirrors the service's <c>AccountBalanceDto</c>.</summary>
public sealed record AccountBalanceDto
{
    public required string Currency { get; init; }

    public decimal Balance { get; init; }

    public decimal AvailableBalance { get; init; }

    public decimal HeldAmount { get; init; }

    public decimal Floor { get; init; }
}

/// <summary>Mirrors the service's <c>StatusCountsResult</c> — one status bucket and its aggregated count.</summary>
public sealed record StatusCountDto
{
    public required string Type { get; init; }

    public required string Status { get; init; }

    public int Count { get; init; }
}

/// <summary>Mirrors the service's <c>LedgerBalanceLineDto</c> — one line per currency across every account in
/// the ledger, never combined.</summary>
public sealed record LedgerBalanceLineDto
{
    public required string Currency { get; init; }

    public decimal Balance { get; init; }

    public decimal Available { get; init; }

    public decimal Held { get; init; }
}

namespace DKNet.Accounts.Client.Contracts;

/// <summary>Mirrors the service's generated <c>CreateAccountGroupRequest</c> (from
/// <c>AccountGroup</c>'s <c>[CrudCreate]</c> constructor).</summary>
public sealed record CreateAccountGroupRequest
{
    public required string Code { get; init; }

    public required string Name { get; init; }

    public string? Description { get; init; }

    public required AccountGroupType Type { get; init; }

    public required string OwnerId { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }
}

/// <summary>Mirrors the service's <c>AccountGroupDto</c>.</summary>
public sealed record AccountGroupDto
{
    public required Guid Id { get; init; }

    public required string Code { get; init; }

    public required string Name { get; init; }

    public string? Description { get; init; }

    public required AccountGroupType Type { get; init; }

    public required AccountGroupStatus Status { get; init; }

    public required string OwnerId { get; init; }

    public IReadOnlyDictionary<string, string>? Metadata { get; init; }
}

/// <summary>Mirrors the service's <c>AccountGroupBalanceLineDto</c> — one line per currency, never combined.</summary>
public sealed record AccountGroupBalanceLineDto
{
    public required string Currency { get; init; }

    public decimal Balance { get; init; }

    public decimal Available { get; init; }

    public decimal Held { get; init; }
}

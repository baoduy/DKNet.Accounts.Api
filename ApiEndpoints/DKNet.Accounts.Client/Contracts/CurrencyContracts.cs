namespace DKNet.Accounts.Client.Contracts;

/// <summary>Mirrors the service's generated <c>CreateCurrencyRequest</c> (from <c>Currency</c>'s
/// <c>[CrudCreate]</c> constructor).</summary>
public sealed record CreateCurrencyRequest
{
    public required string Code { get; init; }

    public required string Name { get; init; }

    public required int DecimalPlaces { get; init; }
}

/// <summary>Mirrors the service's <c>CurrencyDto</c> (generated with no field exclusions, so the audit
/// columns travel over the wire too).</summary>
public sealed record CurrencyDto
{
    public required Guid Id { get; init; }

    public required string Code { get; init; }

    public required string Name { get; init; }

    public required int DecimalPlaces { get; init; }

    public required bool IsActive { get; init; }

    public string? CreatedBy { get; init; }

    public DateTimeOffset? CreatedOn { get; init; }

    public string? UpdatedBy { get; init; }

    public DateTimeOffset? UpdatedOn { get; init; }
}

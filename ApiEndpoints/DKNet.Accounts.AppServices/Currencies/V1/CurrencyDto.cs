namespace DKNet.Accounts.AppServices.Currencies.V1;

public sealed record CurrencyDto
{
    public string Code { get; init; } = null!;

    public int DecimalPlaces { get; init; }
}

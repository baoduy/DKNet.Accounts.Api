namespace DKNet.Accounts.Domains.Share;

/// <summary>
/// A reference currency and the number of decimal places it is legally denominated to (R5).
/// </summary>
public sealed record Currency(string Code, int DecimalPlaces)
{
    public static readonly Currency Sgd = new("SGD", 2);
    public static readonly Currency Usd = new("USD", 2);
    public static readonly Currency Jpy = new("JPY", 0);

    public static readonly IReadOnlyCollection<Currency> All = [Sgd, Usd, Jpy];
}

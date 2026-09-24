namespace DKNet.Accounts.Infra.Features.Currencies;

/// <summary>One currency every database is seeded with, under the same fixed id everywhere.</summary>
internal sealed record SeededCurrency(Guid Id, string Code, string Name, int DecimalPlaces);

/// <summary>
/// The one list of seeded currencies (DRK-1719 §3/§3a), read by the migrations that insert them and by the
/// test harness that re-seeds a database the migrations never ran on — so the two can never disagree.
/// A fiat id ends in its ISO 4217 numeric code (<c>c0de0001-…-000000000978</c> is EUR); a non-ISO asset
/// takes the <c>c0de0002-</c> prefix, which no ISO-derived id can collide with.
/// Never edit or reorder a list once its migration has shipped — a migration re-reads it every time it runs.
/// A new seeded currency goes in a new list, inserted by its own new migration, and joins <see cref="All"/>.
/// </summary>
internal static class SeededCurrencies
{
    /// <summary>Created by <c>system</c> on this fixed date — a literal, so every migration stays deterministic.</summary>
    public const string SeededBy = "system";

    public static readonly DateTimeOffset SeededOn = new(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);

    /// <summary>Inserted by the <c>Initial</c> migration, which carries them as its own hand-written literals.</summary>
    public static readonly IReadOnlyList<SeededCurrency> Initial =
    [
        Fiat("702", "SGD", "Singapore Dollar", 2),
        Fiat("840", "USD", "US Dollar", 2),
        Fiat("392", "JPY", "Japanese Yen", 0)
    ];

    /// <summary>Inserted by the <c>CurrencySetAndUsdt</c> migration (DRK-1719).</summary>
    public static readonly IReadOnlyList<SeededCurrency> CurrencySetAndUsdt =
    [
        Fiat("978", "EUR", "Euro", 2),
        Fiat("826", "GBP", "Pound Sterling", 2),
        Fiat("756", "CHF", "Swiss Franc", 2),
        Fiat("036", "AUD", "Australian Dollar", 2),
        Fiat("124", "CAD", "Canadian Dollar", 2),
        Fiat("554", "NZD", "New Zealand Dollar", 2),
        Fiat("156", "CNY", "Chinese Yuan", 2),
        Fiat("344", "HKD", "Hong Kong Dollar", 2),
        Fiat("901", "TWD", "New Taiwan Dollar", 2),
        Fiat("410", "KRW", "South Korean Won", 0),
        Fiat("356", "INR", "Indian Rupee", 2),
        Fiat("764", "THB", "Thai Baht", 2),
        Fiat("458", "MYR", "Malaysian Ringgit", 2),
        Fiat("608", "PHP", "Philippine Peso", 2),
        Fiat("360", "IDR", "Indonesian Rupiah", 2),
        Fiat("704", "VND", "Vietnamese Dong", 0),
        Fiat("116", "KHR", "Cambodian Riel", 2),
        Fiat("418", "LAK", "Lao Kip", 2),
        Fiat("104", "MMK", "Myanmar Kyat", 2),
        Fiat("096", "BND", "Brunei Dollar", 2),
        Fiat("784", "AED", "UAE Dirham", 2),
        Fiat("682", "SAR", "Saudi Riyal", 2),
        new(new Guid("c0de0002-0000-4000-8000-000000000001"), "USDT", "Tether USD", 6)
    ];

    public static readonly IReadOnlyList<SeededCurrency> All = [.. Initial, .. CurrencySetAndUsdt];

    private static SeededCurrency Fiat(string isoNumeric, string code, string name, int decimalPlaces) =>
        new(new Guid($"c0de0001-0000-4000-8000-000000000{isoNumeric}"), code, name, decimalPlaces);
}

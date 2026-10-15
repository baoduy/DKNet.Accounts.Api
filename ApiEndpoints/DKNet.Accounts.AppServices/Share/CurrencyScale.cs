using System.Collections.Concurrent;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Currencies.V1.Specs;

namespace DKNet.Accounts.AppServices.Share;

/// <summary>
/// Every currency's decimal places, looked up once per code and kept for the life of the process: a
/// currency's decimal places never change once it is registered (<c>Currency.DecimalPlaces</c>), so a
/// cached value can never go stale. A code not yet cached reloads the whole table, which is how a currency
/// registered after start-up is picked up.
/// </summary>
public sealed class CurrencyDecimalPlaces(IServiceScopeFactory scopes)
{
    private readonly ConcurrentDictionary<string, int> _places = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>The decimal places of <paramref name="code"/>, or null when no such currency exists.</summary>
    public int? Of(string code)
    {
        if (_places.TryGetValue(code, out var places))
        {
            return places;
        }

        Reload();
        return _places.TryGetValue(code, out places) ? places : null;
    }

    /// <summary>Forgets every cached value — for a host whose database is wiped and re-seeded under it (tests).</summary>
    public void Clear() => _places.Clear();

    // ponytail: synchronous, because a JSON property getter cannot await; it runs once per currency code per
    // process (the table is small reference data). Warm the cache at start-up if a first read ever shows up.
    private void Reload()
    {
        using var scope = scopes.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IRepositorySpec>();
        foreach (var currency in repository.Query(new SpecGetCurrency())
                     .Select(c => new { c.Code, c.DecimalPlaces })
                     .ToList())
        {
            _places[currency.Code] = currency.DecimalPlaces;
        }
    }
}

/// <summary>
/// DRK-1719 §3 row 11: every amount is stored at 6 decimal places, and every amount the service returns is
/// written with exactly its currency's decimal places — 12400.00 SGD, 5000 JPY, 1.500000 USDT. Done once, as
/// the response is written, so every route gets it: the hand-written handlers, the generated CRUD routes
/// (whose EF projections never pass through a handler) and every list and page alike. It applies to each
/// response type of this assembly that states its <c>Currency</c>: every <see cref="decimal"/> member on it is
/// an amount in that currency. A type whose amounts are in more than one currency names each amount's
/// currency with <see cref="AmountCurrencyAttribute"/> instead, and only those amounts are scaled.
/// </summary>
public static class CurrencyScaleJson
{
    public static JsonSerializerOptions UseCurrencyScale(this JsonSerializerOptions options, Func<string, int?> decimalPlacesOf)
    {
        var resolver = options.TypeInfoResolver ?? new DefaultJsonTypeInfoResolver();
        options.TypeInfoResolver = resolver.WithAddedModifier(typeInfo => Modify(typeInfo, decimalPlacesOf));
        return options;
    }

    /// <summary>
    /// <paramref name="value"/> written with exactly <paramref name="decimalPlaces"/> places. A value finer
    /// than that — which the ledger never stores (R1) — is returned as it is: never rounded to fit.
    /// </summary>
    public static decimal ToScale(decimal value, int decimalPlaces)
    {
        var rounded = decimal.Round(value, decimalPlaces);
        // Adding a zero of the target scale raises the scale to it; decimal addition keeps the larger scale.
        return rounded == value ? rounded + new decimal(0, 0, 0, false, (byte)decimalPlaces) : value;
    }

    internal static void Modify(JsonTypeInfo typeInfo, Func<string, int?> decimalPlacesOf)
    {
        if (typeInfo.Kind != JsonTypeInfoKind.Object || typeInfo.Type.Assembly != typeof(CurrencyScaleJson).Assembly)
        {
            return;
        }

        var named = typeInfo.Type.GetCustomAttributes<AmountCurrencyAttribute>()
            .ToDictionary(a => a.Amount, a => CurrencyGetter(a.Currency));
        var sharedCurrency = named.Count == 0 ? CurrencyGetter("Currency") : null;

        foreach (var property in typeInfo.Properties)
        {
            if (property.Get is not { } get || (property.PropertyType != typeof(decimal) && property.PropertyType != typeof(decimal?)))
            {
                continue;
            }

            var currencyOf = named.Count == 0 ? sharedCurrency : named.GetValueOrDefault(MemberName(property) ?? "");
            if (currencyOf is null)
            {
                continue;
            }

            property.Get = owner => get(owner) is decimal value ? Scale(value, currencyOf(owner)) : null;
        }

        return;

        Func<object, object?>? CurrencyGetter(string member) =>
            typeInfo.Properties.FirstOrDefault(p => p.PropertyType == typeof(string) && MemberName(p) == member)?.Get;

        object Scale(decimal value, object? currency) =>
            currency is string code && decimalPlacesOf(code) is { } places ? ToScale(value, places) : value;
    }

    private static string? MemberName(JsonPropertyInfo property) => (property.AttributeProvider as MemberInfo)?.Name;
}

/// <summary>
/// Names the string member that holds the currency of one amount on a response type whose amounts are in more
/// than one currency (<see cref="CurrencyScaleJson"/>). Once a type carries any of these, only the amounts it
/// names are scaled; a decimal it does not name, such as a rate, is written as it is.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
internal sealed class AmountCurrencyAttribute(string amount, string currency) : Attribute
{
    public string Amount { get; } = amount;

    public string Currency { get; } = currency;
}

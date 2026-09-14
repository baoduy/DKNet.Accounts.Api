using System.Text.Json;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace DKNet.Accounts.Infra.Extensions;

/// <summary>
/// Shared <c>HasConversion</c> plumbing for the free-form <c>IReadOnlyDictionary&lt;string,string&gt;?</c>
/// metadata bag carried by <c>AccountGroup</c> and <c>Account</c> — stored as a single JSON column rather than
/// a child table, since it is opaque, caller-supplied key/value data with no query or join requirement.
/// </summary>
internal static class MetadataConversion
{
    public static readonly ValueConverter<IReadOnlyDictionary<string, string>?, string?> Converter = new(
        value => value == null ? null : JsonSerializer.Serialize(value, (JsonSerializerOptions?)null),
        json => string.IsNullOrEmpty(json)
            ? null
            : JsonSerializer.Deserialize<Dictionary<string, string>>(json, (JsonSerializerOptions?)null));

    public static readonly ValueComparer<IReadOnlyDictionary<string, string>?> Comparer = new(
        (left, right) => JsonSerializer.Serialize(left, (JsonSerializerOptions?)null) ==
                          JsonSerializer.Serialize(right, (JsonSerializerOptions?)null),
        value => value == null ? 0 : JsonSerializer.Serialize(value, (JsonSerializerOptions?)null).GetHashCode(),
        value => value);
}

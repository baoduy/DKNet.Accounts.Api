using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.AppServices.Postings.V1;

/// <summary>
/// Computes the idempotency content-equality fingerprint for a posting request: every field the request
/// actually asks to happen, in a stable/canonical shape (an omitted optional resolves to the same signature
/// as its explicit default, e.g. no <c>EffectiveDate</c> and an explicit "today" are the same request). Two
/// requests under the same (CallingSystem, IdempotencyKey) with an equal signature are "the same request,
/// replayed"; an unequal one is a genuinely different request reusing the key (409 IDEMPOTENCY_KEY_CONFLICT).
/// </summary>
internal static class PostingSignature
{
    public static string Compute(
        Guid accountId,
        PostingDirection direction,
        decimal amount,
        string currency,
        PostingCategory category,
        DateOnly effectiveDate,
        string? description,
        Guid? counterpartyAccountId,
        string? counterpartyReference,
        string? externalReference,
        IReadOnlyDictionary<string, string>? metadata)
    {
        var canonical = new
        {
            accountId,
            direction,
            amount,
            currency,
            category,
            effectiveDate,
            description,
            counterpartyAccountId,
            counterpartyReference,
            externalReference,
            metadata = metadata?.OrderBy(kv => kv.Key, StringComparer.Ordinal)
                .ToDictionary(kv => kv.Key, kv => kv.Value)
        };

        var json = JsonSerializer.Serialize(canonical);
        return Hash(json);
    }

    /// <summary>
    /// Canonicalizes an arbitrary string down to the same 64-char SHA-256 hex digest shape <see cref="Compute"/>
    /// produces. Used to fold several per-leg signatures (joined with a separator) into one batch signature that
    /// still fits the <c>IdempotencySignature</c> column's <c>varchar(64)</c> regardless of leg count, and that
    /// differs from a bare single-leg signature even when there is only one leg (DRK-1247 B3).
    /// </summary>
    public static string Hash(string value)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hash);
    }
}

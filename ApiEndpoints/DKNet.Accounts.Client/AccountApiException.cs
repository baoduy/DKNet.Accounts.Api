using System.Net;

namespace DKNet.Accounts.Client;

/// <summary>One entry of a refused call's <c>errors[]</c> array — either a stable business-rule
/// <see cref="Code"/> (§3 row 6, e.g. <c>GROUP_HOLDS_BALANCE</c>) or a validation <see cref="Field"/> name
/// (e.g. <c>Code</c>), never both, carried byte-identical to what the service sent (R2).</summary>
public sealed record AccountApiError
{
    public string? Code { get; init; }

    public string? Field { get; init; }

    public required string Message { get; init; }
}

/// <summary>Thrown when the service answers a request with a non-success status. Exposes the refusal as
/// data — <see cref="StatusCode"/> and <see cref="Errors"/> — so the caller never has to read the response
/// body's JSON itself (spec §5 "reaches the caller as a code, not as JSON").</summary>
public sealed class AccountApiException : Exception
{
    public AccountApiException(HttpStatusCode statusCode, IReadOnlyList<AccountApiError> errors, string message)
        : base(message)
    {
        StatusCode = statusCode;
        Errors = errors;
    }

    public HttpStatusCode StatusCode { get; }

    public IReadOnlyList<AccountApiError> Errors { get; }
}

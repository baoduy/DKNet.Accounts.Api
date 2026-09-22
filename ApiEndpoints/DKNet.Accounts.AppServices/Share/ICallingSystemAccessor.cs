namespace DKNet.Accounts.AppServices.Share;

/// <summary>
/// Resolves the identity of the calling *application* from the credential's <c>client_id</c> claim (a machine
/// credential), else <c>azp</c> (a person's v2.0 Entra token) or <c>appid</c> (a person's v1.0 Entra token),
/// first non-empty wins (§3 row 10, R1, R4, R5). Never the individual — two people signed in to the same
/// console share one value. This is the single source every write handler stamps "who did this" from — a
/// same-named field in a request body is never trusted, and this is the source the next stage's posting
/// handlers stamp <c>CallingSystem</c> from too.
/// </summary>
public interface ICallingSystemAccessor
{
    /// <summary>
    /// The calling system's identity, or <see langword="null"/> when the current call is unauthenticated (a
    /// route reachable without a credential — none in this service — would see this as null).
    /// </summary>
    string? CallingSystem { get; }
}

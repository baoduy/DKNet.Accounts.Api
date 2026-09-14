namespace DKNet.Accounts.AppServices.Share;

/// <summary>
/// Resolves the identity of the system making the current call from the credential's <c>client_id</c> claim
/// (§3 row 10, R5). This is the single source every write handler stamps "who did this" from — a same-named
/// field in a request body is never trusted, and this is the source the next stage's posting handlers stamp
/// <c>CallingSystem</c> from too.
/// </summary>
public interface ICallingSystemAccessor
{
    /// <summary>
    /// The calling system's identity, or <see langword="null"/> when the current call is unauthenticated (a
    /// route reachable without a credential — none in this service — would see this as null).
    /// </summary>
    string? CallingSystem { get; }
}

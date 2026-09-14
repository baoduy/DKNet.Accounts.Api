namespace DKNet.Accounts.Api.Configs.Handlers;

/// <summary>
/// Reads the calling system's identity from the authenticated caller's <c>client_id</c> claim — the same
/// claim the real credential (and <see cref="DKNet.Accounts.App.TestSupport.LedgerCallerAuthHandler"/> in
/// tests) carries it on. Deliberately distinct from <see cref="IPrincipalProvider"/>: that resolves the acting
/// *human* principal; this resolves the *machine caller* (R5) — conflating the two would misattribute a
/// posting to whichever claim happens to be present.
/// </summary>
internal sealed class CallingSystemAccessor(IHttpContextAccessor accessor) : ICallingSystemAccessor
{
    public string? CallingSystem =>
        accessor.HttpContext?.User.FindFirst("client_id")?.Value;
}

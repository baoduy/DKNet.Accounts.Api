namespace DKNet.Accounts.Api.Configs.Handlers;

/// <summary>
/// Reads the calling system's identity from the authenticated caller's <c>client_id</c> claim (a machine
/// credential), else <c>azp</c> (a person's v2.0 Entra token) or <c>appid</c> (a person's v1.0 Entra token),
/// first non-empty wins — the same claims the real credential (and
/// <see cref="DKNet.Accounts.App.TestSupport.LedgerCallerAuthHandler"/> in tests) carries them on. Deliberately
/// distinct from <see cref="IPrincipalProvider"/>: that resolves the acting *human* principal; this resolves
/// the calling *application* (R5) — conflating the two would misattribute a posting to whichever claim
/// happens to be present.
/// </summary>
internal sealed class CallingSystemAccessor(IHttpContextAccessor accessor) : ICallingSystemAccessor
{
    private static readonly string[] CallingSystemClaimTypes = ["client_id", "azp", "appid"];

    public string? CallingSystem
    {
        get
        {
            var user = accessor.HttpContext?.User;
            if (user == null)
            {
                return null;
            }

            foreach (var claimType in CallingSystemClaimTypes)
            {
                var claim = user.FindFirst(c => string.Equals(c.Type, claimType, StringComparison.OrdinalIgnoreCase));
                if (claim != null && !string.IsNullOrWhiteSpace(claim.Value))
                {
                    return claim.Value;
                }
            }

            return null;
        }
    }
}

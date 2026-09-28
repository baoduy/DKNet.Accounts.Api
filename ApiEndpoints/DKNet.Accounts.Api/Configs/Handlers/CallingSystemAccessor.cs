namespace DKNet.Accounts.Api.Configs.Handlers;

/// <summary>
/// Reads the calling system's identity from the authenticated caller's <c>client_id</c> claim (a machine
/// credential), else <c>azp</c> (a person's v2.0 Entra token) or <c>appid</c> (a person's v1.0 Entra token),
/// first non-empty wins — the same claims the real credential (and
/// <see cref="DKNet.Accounts.App.TestSupport.LedgerCallerAuthHandler"/> in tests) carries them on. Deliberately
/// distinct from <see cref="IPrincipalProvider"/>: that resolves the acting *human* principal; this resolves
/// the calling *application* (R5) — conflating the two would misattribute a posting to whichever claim
/// happens to be present. With <see cref="FeatureOptions.RequireAuthorization"/> off no caller is ever
/// authenticated, so a claim-less caller falls back to <see cref="SharedConsts.SystemAccount"/> — the same
/// fallback <see cref="PrincipalProvider"/> uses — instead of every ledger write being refused.
/// </summary>
internal sealed class CallingSystemAccessor(IHttpContextAccessor accessor, IOptions<FeatureOptions> features)
    : ICallingSystemAccessor
{
    private static readonly string[] CallingSystemClaimTypes = ["client_id", "azp", "appid"];

    public string? CallingSystem
    {
        get
        {
            var fallback = features.Value.RequireAuthorization ? null : SharedConsts.SystemAccount;
            var user = accessor.HttpContext?.User;
            if (user == null)
            {
                return fallback;
            }

            foreach (var claimType in CallingSystemClaimTypes)
            {
                var claim = user.FindFirst(c => string.Equals(c.Type, claimType, StringComparison.OrdinalIgnoreCase));
                if (claim != null && !string.IsNullOrWhiteSpace(claim.Value))
                {
                    return claim.Value;
                }
            }

            return fallback;
        }
    }
}

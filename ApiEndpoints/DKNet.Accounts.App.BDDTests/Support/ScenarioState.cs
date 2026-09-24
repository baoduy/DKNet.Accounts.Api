using DKNet.Accounts.Api.Configs.Auth;

namespace DKNet.Accounts.App.BDDTests.Support;

public sealed class ScenarioState
{
    public HttpResponseMessage? Response { get; set; }

    public string? ResponseBody { get; set; }

    /// <summary>The calling system the next request authenticates as, carried as a <c>client_id</c> claim.
    /// Defaults to PayHub, full scope. Null means the credential carries no <c>client_id</c> — a person's
    /// Entra token names its calling application under <see cref="CallerAzp"/> or <see cref="CallerAppId"/>
    /// instead (DRK-1670).</summary>
    public string? CallerClientId { get; set; } = "PayHub";

    /// <summary>The calling application named as a v2.0 Entra token's <c>azp</c> claim. Null (default) means
    /// the credential carries no <c>azp</c> claim.</summary>
    public string? CallerAzp { get; set; }

    /// <summary>The calling application named as a v1.0 Entra token's <c>appid</c> claim. Null (default) means
    /// the credential carries no <c>appid</c> claim.</summary>
    public string? CallerAppId { get; set; }

    /// <summary>The person named in the next request's credential, alongside the calling system named by
    /// <see cref="CallerClientId"/>/<see cref="CallerAzp"/>/<see cref="CallerAppId"/>. Null (default) means the
    /// credential names no person — today's behaviour.</summary>
    public string? CallerSubject { get; set; }

    public string[] CallerScopes { get; set; } = [.. ScopeNames.All];

    /// <summary>Free-form bag for values one step captures and a later step in the same scenario needs.</summary>
    public Dictionary<string, string> Values { get; } = new();

    /// <summary>
    /// Rework (finding 1): the stream positions actually returned while paging a statement, accumulated in
    /// return order across every page read. Lets the "returned ... in stream order" / "none appears on two
    /// pages and none is missing" Then steps assert real, structural invariants (no gaps, no duplicates, in
    /// order) instead of only checking the last page's HTTP status.
    /// </summary>
    public List<long> StatementStreamPositions { get; } = [];

    /// <summary>
    /// The status the generic "the request is refused" catch-all asserts. Defaults to 422 — §5's status for a
    /// business-rule refusal — and is overridden by the Given/When steps of the three scenarios where §5 names
    /// a different status (401 unauthenticated, 403 wrong scope, 409 idempotency conflict). The same step text
    /// appears verbatim in other scenarios that DO want 422, so this can't be resolved by step text alone.
    /// </summary>
    public HttpStatusCode ExpectedRefusalStatus { get; set; } = HttpStatusCode.UnprocessableEntity;
}

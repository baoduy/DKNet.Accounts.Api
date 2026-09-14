using DKNet.Accounts.Api.Configs.Auth;

namespace DKNet.Accounts.App.BDDTests.Support;

public sealed class ScenarioState
{
    public HttpResponseMessage? Response { get; set; }

    public string? ResponseBody { get; set; }

    /// <summary>The calling system the next request authenticates as. Defaults to PayHub, full scope.</summary>
    public string CallerClientId { get; set; } = "PayHub";

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

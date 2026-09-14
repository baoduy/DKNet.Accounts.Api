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
}

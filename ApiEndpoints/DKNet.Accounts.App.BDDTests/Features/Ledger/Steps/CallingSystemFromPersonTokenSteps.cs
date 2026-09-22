using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-1670 — the service must identify its calling application when the caller is a person
/// signed in through Microsoft Entra ID, not only when the caller is a machine credential. Given steps here set
/// up the three credential shapes a real token can carry (<c>client_id</c>, <c>azp</c> on a v2.0 token,
/// <c>appid</c> on a v1.0 token, or none at all); the When/Then vocabulary — recording a posting, reading its
/// calling system and created-by — is shared with <see cref="AuthorFromCredentialSteps"/>, which already reads
/// both fields straight from <c>CoreDbContext</c>.
/// </summary>
[Binding]
public sealed class CallingSystemFromPersonTokenSteps(HttpClient client, ScenarioState state)
{
    private const string FeatureName = "Calling system from a person's token";

    #region Given

    [Given(@"""([^""]+)"" is an authenticated console operator calling from ""([^""]+)"" on a v2\.0 token")]
    public void GivenIsAnAuthenticatedConsoleOperatorCallingFromOnAV20Token(string person, string consoleApp)
    {
        state.CallerClientId = null;
        state.CallerAzp = consoleApp;
        state.CallerAppId = null;
        state.CallerSubject = person;
        state.CallerScopes = [.. ScopeNames.All];
    }

    [Given(@"""([^""]+)"" is an authenticated console operator calling from ""([^""]+)"" on a v1\.0 token")]
    public void GivenIsAnAuthenticatedConsoleOperatorCallingFromOnAV10Token(string person, string consoleApp)
    {
        state.CallerClientId = null;
        state.CallerAzp = null;
        state.CallerAppId = consoleApp;
        state.CallerSubject = person;
        state.CallerScopes = [.. ScopeNames.All];
    }

    [Given(@"""([^""]+)"" is an authenticated person whose token names no calling application")]
    public void GivenIsAnAuthenticatedPersonWhoseTokenNamesNoCallingApplication(string person)
    {
        state.CallerClientId = null;
        state.CallerAzp = null;
        state.CallerAppId = null;
        state.CallerSubject = person;
        state.CallerScopes = [.. ScopeNames.All];
    }

    #endregion

    #region When

    /// <summary>
    /// A separate phrasing from <see cref="AuthorFromCredentialSteps.WhenRecordsACreditToAccount"/>: that step
    /// forces the created posting's id out of the response, which crashes rather than reaching this scenario's
    /// own refusal assertion when the caller carries no calling application at all.
    /// </summary>
    [When(@"""([^""]+)"" tries to record a credit of ([\d.]+) (\w+) to account ""([^""]+)""")]
    public async Task WhenTriesToRecordACreditToAccount(string caller, decimal amount, string currency, string label)
    {
        var accountId = Guid.Parse(state.Values[$"account:{label}"]);
        state.Response = await client.SendAsCallerAsync(state, HttpMethod.Post, "/v1/postings", new
        {
            accountId, direction = "Credit", amount, currency, category = "Transfer"
        });
    }

    #endregion

    #region Then

    // Scoped to this feature so it wins over LedgerSteps.ThenTheRequestIsRefused's catch-all (which asserts
    // status only, defaulting to 422 — the wrong status for this code-less guard). Pinning both the exact
    // status and the exact message keeps this scenario red for the right reason rather than for any other
    // refusal a Build could return by accident.
    [Then(@"the request is refused because the caller names no calling application")]
    [Scope(Feature = FeatureName)]
    public async Task ThenTheRequestIsRefusedBecauseTheCallerNamesNoCallingApplication()
    {
        // A code-less Command failure (no LedgerErrors code) answers 400, not 422 — the same status
        // Reverse.cs's own code-less "An Idempotency-Key header is required..." guard gets
        // (PostingsHandlerTests.Reverse_WithoutAnIdempotencyKey_IsRejected).
        state.Response!.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var doc = await state.Response!.Content.ReadFromJsonAsync<JsonElement>();
        doc.GetProperty("errors").EnumerateArray()
            .Any(e => e.TryGetProperty("message", out var message) &&
                      message.GetString() == "The caller is not authenticated.")
            .ShouldBeTrue($"expected an error carrying message 'The caller is not authenticated.', got: {doc}");
    }

    #endregion
}

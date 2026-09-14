namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// Steps shared by more than one feature file (the same precondition and rejection wording recurs
/// across scenarios). Kept in one binding so the exact step text is not duplicated — and made
/// ambiguous — across per-feature step classes.
/// </summary>
[Binding]
public sealed class CommonSteps(ScenarioState state)
{
    [Given("the service is running with no Redis connection configured")]
    public void GivenTheServiceIsRunningWithNoRedisConnectionConfigured()
    {
        // The BDD host never sets ConnectionStrings:Redis — this is the default, already-in-effect state.
    }

    [Then("the request is rejected")]
    public void ThenTheRequestIsRejected()
    {
        state.Response.ShouldNotBeNull();
        state.Response!.IsSuccessStatusCode.ShouldBeFalse();
    }

    [Then(@"the response status is (\d+)")]
    public void ThenTheResponseStatusIs(int statusCode)
    {
        state.Response.ShouldNotBeNull();
        ((int)state.Response!.StatusCode).ShouldBe(statusCode);
    }
}

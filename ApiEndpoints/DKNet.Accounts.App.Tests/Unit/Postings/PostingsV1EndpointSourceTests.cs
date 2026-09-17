namespace DKNet.Accounts.App.Tests.Unit.Postings;

/// <summary>
/// DRK-1535 §7, "Neither posting route reads the header by hand": a source scan of
/// <c>PostingsV1Endpoint.cs</c> rather than an integration test, because the thing being proved is the
/// absence of a coding pattern (a hand-written <c>Headers["Idempotency-Key"]</c> read and its supporting
/// <c>HttpRequest</c> delegate parameter), not a runtime outcome — both posting routes carry the caller's key
/// exactly as before once §3 row 3-5 land, so no behavioural test can tell the hand-written read apart from
/// the declared <c>[FromRequestHeader]</c> source. Red today: both routes still carry the pattern (§3 row 5
/// not yet applied).
/// </summary>
public class PostingsV1EndpointSourceTests
{
    private static string ReadSource()
    {
        var path = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory, "../../../../..",
            "ApiEndpoints/DKNet.Accounts.Api/ApiEndpoints/Postings/PostingsV1Endpoint.cs"));

        File.Exists(path).ShouldBeTrue();
        return File.ReadAllText(path);
    }

    [Fact]
    public void PostingsV1Endpoint_ShouldNotReadTheIdempotencyKeyHeaderByHand()
    {
        var source = ReadSource();

        source.Contains("Headers[\"Idempotency-Key\"]", StringComparison.Ordinal).ShouldBeFalse(
            "the route must take the idempotency key from a declared header source, not a hand-written read");
    }

    [Fact]
    public void PostingsV1Endpoint_ShouldNotDeclareAnHttpRequestParameterOnEitherPostingRoute()
    {
        var source = ReadSource();

        source.Contains("HttpRequest http", StringComparison.Ordinal).ShouldBeFalse(
            "the HttpRequest delegate parameter existed only to carry the hand-written header read");
    }
}

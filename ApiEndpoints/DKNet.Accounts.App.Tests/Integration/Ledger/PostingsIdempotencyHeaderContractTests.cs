using DKNet.Accounts.App.Tests.Integration.Support;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// DRK-1535 §7, "Both operations publish the header parameter": the 12.0.0 surface adds no OpenAPI
/// contribution for <c>[FromRequestHeader]</c> (§9 Q1) — the header parameter is declared by hand on each
/// route (§3 row 5) — so this reads the generated OpenAPI document, the published contract, rather than the
/// attribute or the route mapping directly. Reuses <see cref="SwaggerOnApiFixture"/>, the existing way to
/// reach <c>/openapi/v1.json</c> (<see cref="AuthorFromCredentialContractTests"/>); no new seam.
/// Reverse is covered here too, now that it requires the header — the third case fails if its
/// <c>[FromRequestHeader]</c> is dropped, which is the only reason the header reaches the validator at all.
/// </summary>
public sealed class PostingsIdempotencyHeaderContractTests(SwaggerOnApiFixture fixture)
    : IClassFixture<SwaggerOnApiFixture>
{
    [Theory]
    [InlineData("/v1/postings", "post")]
    [InlineData("/v1/postings/batch", "post")]
    [InlineData("/v1/postings/{id}/reverse", "post")]
    public async Task PostingRoute_PublishesTheIdempotencyKeyHeaderParameter(string path, string method)
    {
        var response = await fixture.CreateClient().GetAsync("/openapi/v1.json");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var doc = JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
        doc.GetProperty("paths").TryGetProperty(path, out var pathItem)
            .ShouldBeTrue($"expected the OpenAPI document to publish {path}");
        pathItem.TryGetProperty(method, out var operation)
            .ShouldBeTrue($"expected {path} to publish a {method.ToUpperInvariant()} operation");

        var hasHeaderParam = operation.TryGetProperty("parameters", out var parameters) &&
            parameters.EnumerateArray().Any(p =>
                string.Equals(p.GetProperty("name").GetString(), "Idempotency-Key", StringComparison.OrdinalIgnoreCase) &&
                p.GetProperty("in").GetString() == "header");

        hasHeaderParam.ShouldBeTrue(
            $"expected {method.ToUpperInvariant()} {path} to declare an Idempotency-Key header parameter");
    }
}

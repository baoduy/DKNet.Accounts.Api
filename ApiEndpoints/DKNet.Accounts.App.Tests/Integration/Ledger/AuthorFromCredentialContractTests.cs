using DKNet.Accounts.App.Tests.Integration.Support;

namespace DKNet.Accounts.App.Tests.Integration.Ledger;

/// <summary>
/// DRK-1372 §5, "No write route offers an author field": reads the generated OpenAPI document — the
/// published contract — rather than any one route's DTO, so a future write route is covered without a new
/// per-route test. Reuses <see cref="SwaggerOnApiFixture"/>, the existing way to reach
/// <c>/openapi/v1.json</c> (<see cref="SecurityHeaders.DocsContentSecurityPolicyTests"/>); no new seam.
/// </summary>
public sealed class AuthorFromCredentialContractTests(SwaggerOnApiFixture fixture)
    : IClassFixture<SwaggerOnApiFixture>
{
    [Fact]
    public async Task NoWriteRouteRequestShape_CarriesAFieldForTheAuthorOfTheChange()
    {
        var response = await fixture.CreateClient().GetAsync("/openapi/v1.json");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var doc = JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
        var schemas = doc.GetProperty("components").GetProperty("schemas");

        var offendingRoutes = new List<string>();
        foreach (var path in doc.GetProperty("paths").EnumerateObject())
        {
            foreach (var operation in path.Value.EnumerateObject())
            {
                if (operation.Name is not ("post" or "put" or "patch"))
                {
                    continue;
                }

                if (!operation.Value.TryGetProperty("requestBody", out var requestBody))
                {
                    continue;
                }

                var schema = requestBody.GetProperty("content").GetProperty("application/json").GetProperty("schema");
                if (SchemaHasAuthorField(schema, schemas, []))
                {
                    offendingRoutes.Add($"{operation.Name.ToUpperInvariant()} {path.Name}");
                }
            }
        }

        offendingRoutes.ShouldBeEmpty(
            $"route(s) with a field for the author of the change: {string.Join(", ", offendingRoutes)}");
    }

    private static bool SchemaHasAuthorField(JsonElement schema, JsonElement schemas, HashSet<string> visitedRefs)
    {
        if (schema.TryGetProperty("$ref", out var refProp))
        {
            var schemaName = refProp.GetString()!.Split('/')[^1];
            return visitedRefs.Add(schemaName)
                   && schemas.TryGetProperty(schemaName, out var resolved)
                   && SchemaHasAuthorField(resolved, schemas, visitedRefs);
        }

        return schema.TryGetProperty("properties", out var properties)
               && properties.EnumerateObject().Any(p => string.Equals(p.Name, "author", StringComparison.OrdinalIgnoreCase));
    }
}

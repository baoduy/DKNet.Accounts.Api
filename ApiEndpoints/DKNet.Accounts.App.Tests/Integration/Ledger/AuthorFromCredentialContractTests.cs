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
    /// <summary>
    /// Exact, case-insensitive field names that would let a caller name the acting user (DRK-1372 §3: "the
    /// system must offer no author field on any request, generated or hand-written"). A future
    /// <c>[CrudUpdate]</c>/<c>[CrudCreate]</c> on a method like <c>Account.ChangeStatus(AccountStatus, string
    /// userId)</c> (<c>Account.cs:143</c>) generates a request whose shape is that trailing parameter — this is
    /// what would actually reintroduce the field the scenario guards against, not a property literally called
    /// "author". Exact names, not a substring match on "by"/"user" — that would misfire on the legitimate
    /// <c>ownerId</c> field on the account-group create request.
    /// </summary>
    private static readonly string[] AuthorFieldNames =
    [
        "author", "authorId", "byUser", "userId", "actingUser", "actingUserId",
        "createdBy", "updatedBy", "modifiedBy", "changedBy"
    ];

    [Fact]
    public async Task NoWriteRouteRequestShape_CarriesAFieldForTheAuthorOfTheChange()
    {
        var response = await fixture.CreateClient().GetAsync("/openapi/v1.json");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var doc = JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
        var schemas = doc.GetProperty("components").GetProperty("schemas");

        var offending = new List<string>();
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
                var field = FindAuthorField(schema, schemas, []);
                if (field is not null)
                {
                    offending.Add($"{operation.Name.ToUpperInvariant()} {path.Name} ({field})");
                }
            }
        }

        offending.ShouldBeEmpty(
            $"route(s) with a field for the author of the change: {string.Join(", ", offending)}");
    }

    /// <summary>Negative control (dev-leader review): proves the matcher actually fires, so the scenario above
    /// can tell "no such field" from "the matcher never fires" — without this, a matcher that silently stopped
    /// matching anything would leave the scenario green for the wrong reason.</summary>
    [Fact]
    public void FindAuthorField_MatchesAKnownActingUserFieldName()
    {
        var schema = JsonSerializer.Deserialize<JsonElement>("""{"properties":{"userId":{"type":"string"}}}""");
        var noSchemas = JsonSerializer.Deserialize<JsonElement>("{}");

        FindAuthorField(schema, noSchemas, []).ShouldBe("userId");
    }

    private static string? FindAuthorField(JsonElement schema, JsonElement schemas, HashSet<string> visitedRefs)
    {
        if (schema.TryGetProperty("$ref", out var refProp))
        {
            var schemaName = refProp.GetString()!.Split('/')[^1];
            return visitedRefs.Add(schemaName) && schemas.TryGetProperty(schemaName, out var resolved)
                ? FindAuthorField(resolved, schemas, visitedRefs)
                : null;
        }

        if (!schema.TryGetProperty("properties", out var properties))
        {
            return null;
        }

        foreach (var property in properties.EnumerateObject())
        {
            if (AuthorFieldNames.Any(name => string.Equals(name, property.Name, StringComparison.OrdinalIgnoreCase)))
            {
                return property.Name;
            }
        }

        return null;
    }
}

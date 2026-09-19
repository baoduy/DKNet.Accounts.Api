using System.Net.Http.Json;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.SecurityHeaders;

/// <summary>
/// DRK-1028 §5 (R5): security response headers accompany a successful response, a 404 to an unpublished path,
/// and a response produced by an unhandled failure alike — a middleware-placement assertion, since only the
/// unhandled-failure case catches wiring the middleware after the point where <c>Response.Clear()</c> would
/// wipe headers added the ordinary way.
/// </summary>
public sealed class SecurityHeadersPlacementTests
{
    private const string ServerHeader = "Server";

    private static void AssertStandardSecurityHeaders(HttpResponseMessage response)
    {
        response.Headers.Contains("X-Frame-Options").ShouldBeTrue();
        response.Headers.Contains("X-Content-Type-Options").ShouldBeTrue();
        (response.Content.Headers.Contains("Content-Security-Policy") ||
            response.Headers.Contains("Content-Security-Policy")).ShouldBeTrue();
        response.Headers.Contains(ServerHeader).ShouldBeFalse("the response must not name the web server product.");
    }

    public sealed class OnASuccessfulResponse(ApiFixture fixture) : IClassFixture<ApiFixture>
    {
        [Fact]
        public async Task SecurityHeadersAccompanyTheResponse()
        {
            var response = await fixture.CreateClient().GetAsync("/healthz");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            AssertStandardSecurityHeaders(response);
        }
    }

    public sealed class OnAnUnpublishedPath(ApiFixture fixture) : IClassFixture<ApiFixture>
    {
        [Fact]
        public async Task SecurityHeadersAccompanyTheNotFoundResponse()
        {
            var response = await fixture.CreateClient().GetAsync("/this-route-does-not-exist");

            response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
            AssertStandardSecurityHeaders(response);
        }
    }

    public sealed class OnAnUnhandledFailure(FailingWriteApiFixture fixture) : IClassFixture<FailingWriteApiFixture>
    {
        [Fact]
        public async Task SecurityHeadersAccompanyTheServerErrorResponse()
        {
            var client = fixture.CreateClient();

            // Creating a group is the write that needs no pre-existing data to validate against. Opening an
            // account no longer qualifies: an account number is {group code}-{suffix}, so Open reads its
            // group and refuses a nonexistent one before ever reaching a write — and this fixture fails
            // every write, so it could not seed that group either. Any endpoint that reaches SaveChanges
            // works for the "every write fails" simulation; this one always does. A real caller identity is
            // required too — every write handler refuses an unauthenticated caller (R5) before any write.
            using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/account-groups")
            {
                Content = JsonContent.Create(new
                {
                    code = $"G{Guid.NewGuid():N}"[..5].ToUpperInvariant(),
                    name = "Operating",
                    type = "Customer",
                    ownerId = "PayHub"
                })
            };
            request.Headers.Add(LedgerCallerAuthHandler.ClientIdHeaderName, "PayHub");
            request.Headers.Add(LedgerCallerAuthHandler.ScopesHeaderName, string.Join(' ', ScopeNames.All));

            var response = await client.SendAsync(request);

            response.StatusCode.ShouldBe(HttpStatusCode.InternalServerError);
            AssertStandardSecurityHeaders(response);
        }
    }
}

using Microsoft.AspNetCore.Mvc.Testing;
using DKNet.Accounts.App.Tests.Integration.Support;
using DKNet.Accounts.App.TestSupport;

namespace DKNet.Accounts.App.Tests.Integration.SharedHosting;

/// <summary>
/// DKNet's antiforgery guard issues a readable <c>XSRF-TOKEN</c> cookie on every GET. These requests go over HTTPS
/// because that cookie is Secure-only (a plain HTTP request is refused with 500), with cookie handling off because
/// the factory's default handler would consume <c>Set-Cookie</c> before the test sees it.
/// </summary>
public sealed class AntiforgeryCookieTests
{
    private static async Task<string[]> SetCookiesOfAGet(TestApiFactoryBase factory)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = false
        });

        var response = await client.GetAsync("/healthz");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        return response.Headers.TryGetValues("Set-Cookie", out var values) ? [.. values] : [];
    }

    /// <summary>Shipped settings keep <c>EnableAntiforgery</c> off, so no token cookie is issued.</summary>
    public sealed class WithShippedSettings(ApiFixture fixture) : IClassFixture<ApiFixture>
    {
        [Fact]
        public async Task AGetSetsNoXsrfTokenCookie()
        {
            var cookies = await SetCookiesOfAGet(fixture);

            cookies.ShouldNotContain(c => c.StartsWith("XSRF-TOKEN=", StringComparison.Ordinal));
        }
    }

    /// <summary>Presence sibling: with <c>EnableAntiforgery</c> on, the same GET is issued the token cookie.</summary>
    public sealed class WithAntiforgeryOn(WithAntiforgeryOn.AntiforgeryOnApiFixture fixture)
        : IClassFixture<WithAntiforgeryOn.AntiforgeryOnApiFixture>
    {
        [Fact]
        public async Task AGetSetsTheXsrfTokenCookie()
        {
            var cookies = await SetCookiesOfAGet(fixture);

            cookies.ShouldContain(c => c.StartsWith("XSRF-TOKEN=", StringComparison.Ordinal));
        }

        public sealed class AntiforgeryOnApiFixture() : EnvOverrideApiFixture(new Dictionary<string, string?>
        {
            ["FeatureManagement__EnableAntiforgery"] = "true"
        });
    }
}

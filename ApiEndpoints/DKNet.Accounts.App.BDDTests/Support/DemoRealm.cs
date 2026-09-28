using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// Talks to the Keycloak the running AppHost started (DRK-1796), the way its users do: a person signs in through
/// the realm's own login form (authorization code with PKCE, no password grant), and a developer signs in to the
/// admin screen as <c>admin</c> / <c>admin</c> through the admin console's own client.
/// </summary>
public static partial class DemoRealm
{
    /// <summary>DRK-1796 §3: the admin screen login AppHost sets as parameters.</summary>
    public const string AdminLogin = "admin";

    /// <summary>The redirect address DRK-1796 §3 row 2 registers for the console's client.</summary>
    public const string ConsoleRedirectUri = "http://localhost:3000/signin/callback";

    private const string AdminConsoleClient = "security-admin-console";

    [GeneratedRegex(@"<form[^>]*id=""kc-form-login""[^>]*action=""(?<action>[^""]+)""", RegexOptions.IgnoreCase)]
    private static partial Regex LoginForm();

    private static string Base => AppHostRun.KeycloakBase.ToString().TrimEnd('/');

    /// <summary>The demo realm file DRK-1796 §3 row 2 adds, as JSON.</summary>
    public static JsonElement RealmFile()
    {
        var files = Directory.Exists(AppHostManifest.RealmsDirectory)
            ? Directory.GetFiles(AppHostManifest.RealmsDirectory, "*.json")
            : [];
        var realms = files
            .Select(f => JsonDocument.Parse(File.ReadAllText(f)).RootElement.Clone())
            .Where(r => r.TryGetProperty("realm", out var name) && name.GetString() == AppHostRun.RealmName)
            .ToArray();
        realms.Length.ShouldBe(1,
            $"{AppHostManifest.RealmsDirectory} must hold exactly one realm file for '{AppHostRun.RealmName}'.");
        return realms[0];
    }

    /// <summary>The client id of TrafficGen's own machine client: the realm's one client-credentials client.</summary>
    public static string MachineClientId()
    {
        var machine = RealmFile().GetProperty("clients").EnumerateArray()
            .Where(c => c.TryGetProperty("serviceAccountsEnabled", out var enabled) && enabled.GetBoolean())
            .Select(c => c.GetProperty("clientId").GetString()!)
            .ToArray();
        machine.Length.ShouldBe(1, "the demo realm must hold exactly one machine (client-credentials) client.");
        return machine[0];
    }

    /// <summary>
    /// Signs <paramref name="user"/> in through the realm's login form as the console does — its client, its secret,
    /// its scopes and its registered redirect address — and returns the access token the console would hold.
    /// </summary>
    public static async Task<string> SignInAsync(string user, string password, ConsoleClient console)
    {
        var tokens = await AuthorizationCodeAsync(AppHostRun.RealmName, console.ClientId, console.ClientSecret,
            ConsoleRedirectUri, $"openid {console.Scopes}", user, password);
        return tokens.GetProperty("access_token").GetString()!;
    }

    /// <summary>Signs in to the Keycloak admin screen (the master realm's admin console client).</summary>
    public static async Task<string> SignInToAdminScreenAsync(string user, string password)
    {
        var tokens = await AuthorizationCodeAsync("master", AdminConsoleClient, null,
            $"{Base}/admin/master/console/", "openid", user, password);
        return tokens.GetProperty("access_token").GetString()!;
    }

    public static async Task<IReadOnlyList<string>> RealmNamesAsync(string adminToken)
    {
        using var http = Admin(adminToken);
        var realms = await http.GetFromJsonAsync<JsonElement>($"{Base}/admin/realms");
        return [.. realms.EnumerateArray().Select(r => r.GetProperty("realm").GetString()!)];
    }

    /// <summary>The demo realm's people — its client's service-account users left out.</summary>
    public static async Task<IReadOnlyList<string>> UserNamesAsync(string adminToken)
    {
        using var http = Admin(adminToken);
        var users = await http.GetFromJsonAsync<JsonElement>($"{Base}/admin/realms/{AppHostRun.RealmName}/users?max=1000");
        return [.. users.EnumerateArray()
            .Select(u => u.GetProperty("username").GetString()!)
            .Where(u => !u.StartsWith("service-account-", StringComparison.Ordinal))
            .Order(StringComparer.Ordinal)];
    }

    public static async Task AddUserAsync(string adminToken, string userName)
    {
        using var http = Admin(adminToken);
        using var response = await http.PostAsJsonAsync($"{Base}/admin/realms/{AppHostRun.RealmName}/users",
            new { username = userName, enabled = true });
        response.StatusCode.ShouldBe(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
    }

    /// <summary>The user Keycloak signs a client's client-credentials tokens as (their <c>sub</c>).</summary>
    public static async Task<string> ServiceAccountUserIdAsync(string adminToken, string clientId)
    {
        using var http = Admin(adminToken);
        var clients = await http.GetFromJsonAsync<JsonElement>(
            $"{Base}/admin/realms/{AppHostRun.RealmName}/clients?clientId={Uri.EscapeDataString(clientId)}");
        var id = clients.EnumerateArray().Single().GetProperty("id").GetString();
        var user = await http.GetFromJsonAsync<JsonElement>(
            $"{Base}/admin/realms/{AppHostRun.RealmName}/clients/{id}/service-account-user");
        return user.GetProperty("id").GetString()!;
    }

    /// <summary>
    /// Adds a signing key the scenario holds the private half of to the demo realm (lowest priority, so the realm
    /// keeps signing with its own), so the scenario can present a token the realm's key set vouches for but whose
    /// lifetime or audience it chose. Lost when the AppHost restarts, like every admin screen change.
    /// </summary>
    public static async Task<TokenSigner> AddScenarioSigningKeyAsync(string adminToken)
    {
        using var http = Admin(adminToken);
        var realm = await http.GetFromJsonAsync<JsonElement>($"{Base}/admin/realms/{AppHostRun.RealmName}");
        var rsa = RSA.Create(2048);
        var name = $"scenario-{Guid.NewGuid():N}";
        using var created = await http.PostAsJsonAsync($"{Base}/admin/realms/{AppHostRun.RealmName}/components", new
        {
            name,
            providerId = "rsa",
            providerType = "org.keycloak.keys.KeyProvider",
            parentId = realm.GetProperty("id").GetString(),
            config = new Dictionary<string, string[]>
            {
                ["priority"] = ["0"],
                ["enabled"] = ["true"],
                ["active"] = ["true"],
                ["algorithm"] = ["RS256"],
                ["privateKey"] = [rsa.ExportPkcs8PrivateKeyPem()]
            }
        });
        created.StatusCode.ShouldBe(HttpStatusCode.Created, await created.Content.ReadAsStringAsync());
        var componentId = created.Headers.Location!.Segments[^1];

        var keys = await http.GetFromJsonAsync<JsonElement>($"{Base}/admin/realms/{AppHostRun.RealmName}/keys");
        var kid = keys.GetProperty("keys").EnumerateArray()
            .Single(k => k.GetProperty("providerId").GetString() == componentId)
            .GetProperty("kid").GetString()!;
        return new TokenSigner(rsa, kid);
    }

    /// <summary>A key no sign-in server the ledger trusts publishes.</summary>
    public static TokenSigner UnknownSigningKey() => new(RSA.Create(2048), $"unknown-{Guid.NewGuid():N}");

    public static JsonElement Payload(string jwt) =>
        JsonDocument.Parse(Base64UrlDecode(jwt.Split('.')[1])).RootElement.Clone();

    private static async Task<JsonElement> AuthorizationCodeAsync(string realm, string clientId, string? clientSecret,
        string redirectUri, string scope, string user, string password)
    {
        var verifier = Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var challenge = Base64UrlEncode(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        var state = Guid.NewGuid().ToString("N");
        var protocol = $"{Base}/realms/{realm}/protocol/openid-connect";

        // Keycloak marks its login cookies Secure, which a browser still sends to http://localhost (a secure
        // context) but HttpClient's cookie container never sends over http — so they are carried by hand.
        using var handler = new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false };
        using var http = new HttpClient(handler);
        var cookies = new Dictionary<string, string>();

        var authorize = $"{protocol}/auth?response_type=code&client_id={Uri.EscapeDataString(clientId)}" +
                        $"&redirect_uri={Uri.EscapeDataString(redirectUri)}&scope={Uri.EscapeDataString(scope)}" +
                        $"&state={state}&code_challenge={challenge}&code_challenge_method=S256";
        using var page = await SendAsync(http, cookies, new HttpRequestMessage(HttpMethod.Get, authorize));
        var html = await page.Content.ReadAsStringAsync();
        page.StatusCode.ShouldBe(HttpStatusCode.OK, $"Keycloak did not show its login form for client '{clientId}':\n{html}");
        var form = LoginForm().Match(html);
        form.Success.ShouldBeTrue($"Keycloak's answer for client '{clientId}' holds no login form:\n{html}");

        using var submitted = await SendAsync(http, cookies, new HttpRequestMessage(HttpMethod.Post,
            WebUtility.HtmlDecode(form.Groups["action"].Value))
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["username"] = user, ["password"] = password })
        });
        submitted.StatusCode.ShouldBe(HttpStatusCode.Found,
            $"signing in as '{user}' was not accepted:\n{await submitted.Content.ReadAsStringAsync()}");
        var callback = submitted.Headers.Location!;
        callback.GetLeftPart(UriPartial.Path).ShouldBe(redirectUri);
        var query = System.Web.HttpUtility.ParseQueryString(callback.Query);
        query["state"].ShouldBe(state);

        var form2 = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = query["code"]!,
            ["redirect_uri"] = redirectUri,
            ["client_id"] = clientId,
            ["code_verifier"] = verifier
        };
        if (clientSecret is not null)
        {
            form2["client_secret"] = clientSecret;
        }

        using var token = await http.PostAsync($"{protocol}/token", new FormUrlEncodedContent(form2));
        var body = await token.Content.ReadAsStringAsync();
        token.StatusCode.ShouldBe(HttpStatusCode.OK, $"the code for '{user}' was not exchanged for tokens:\n{body}");
        return JsonDocument.Parse(body).RootElement.Clone();
    }

    private static async Task<HttpResponseMessage> SendAsync(HttpClient http, Dictionary<string, string> cookies,
        HttpRequestMessage request)
    {
        using (request)
        {
            if (cookies.Count > 0)
            {
                request.Headers.Add("Cookie", string.Join("; ", cookies.Select(c => $"{c.Key}={c.Value}")));
            }

            var response = await http.SendAsync(request);
            foreach (var header in response.Headers.TryGetValues("Set-Cookie", out var values) ? values : [])
            {
                var pair = header.Split(';', 2)[0].Split('=', 2);
                cookies[pair[0].Trim()] = pair.Length > 1 ? pair[1] : "";
            }

            return response;
        }
    }

    private static HttpClient Admin(string token)
    {
        var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return http;
    }

    public static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string text)
    {
        var padded = text.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(padded.PadRight(padded.Length + ((4 - (padded.Length % 4)) % 4), '='));
    }
}

/// <summary>What AppHost hands the console for signing in (its <c>CONSOLE_ENTRA_*</c> values).</summary>
public sealed record ConsoleClient(string ClientId, string ClientSecret, string Scopes);

/// <summary>Signs a JWT (RS256) with a key the scenario holds.</summary>
public sealed class TokenSigner(RSA key, string kid)
{
    public string Sign(JsonElement payload, Action<Dictionary<string, JsonElement>> change)
    {
        var claims = payload.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.Clone());
        change(claims);
        var header = DemoRealm.Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new { alg = "RS256", typ = "JWT", kid }));
        var body = DemoRealm.Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(claims));
        var signature = key.SignData(Encoding.ASCII.GetBytes($"{header}.{body}"), HashAlgorithmName.SHA256,
            RSASignaturePadding.Pkcs1);
        return $"{header}.{body}.{DemoRealm.Base64UrlEncode(signature)}";
    }
}

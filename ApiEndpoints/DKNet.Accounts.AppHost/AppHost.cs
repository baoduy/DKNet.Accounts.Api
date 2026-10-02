using Projects;

var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("Redis");
// pgAdmin (linked from the dashboard) comes pre-registered with this server, so the ledger tables can be browsed
// without entering a connection.
var postgres = builder.AddPostgres("Postgres")
    .WithPgAdmin();
// The management UI (linked from the dashboard) is where the outbound ledger-events queue can be inspected.
// Fixed dev login for the management UI (not "guest": RabbitMQ only lets guest in from inside the container).
var rabbitUser = builder.AddParameter("RabbitMqUser", "admin");
var rabbitPassword = builder.AddParameter("RabbitMqPassword", "admin", secret: true);
var rabbitMq = builder.AddRabbitMQ("RabbitMq", rabbitUser, rabbitPassword)
    .WithManagementPlugin();

var apDb = postgres
    .AddDatabase("AppDb");

// Demo sign-in server (DRK-1796): under AppHost the console, the ledger and TrafficGen all sign in through this local
// Keycloak, so the demo needs no Entra ID app registration. Its realm (clients, the 5 ledger scopes, the users
// admin/operator/viewer with password = user name) is re-imported from Realms/ at every start; with no data volume,
// anything changed in the admin screen is gone after a restart. Its secrets are committed on purpose: they exist only
// here, and nothing published trusts this Keycloak.
// The port is fixed because the issuer address baked into every token (checked by the ledger's ValidIssuer and the
// console's discovery) and the admin screen address must be identical on every run. 8180, as 8080 is the API's port
// in docker-compose. Aspire binds both that port and the container's own published port to 127.0.0.1 only, so other
// machines cannot reach it.
const string demoRealm = "dknet-accounts";
const string ledgerAudience = "dknet-accounts-api";
// Fixed admin screen login, set the same way as the RabbitMQ one above.
var keycloakUser = builder.AddParameter("KeycloakAdminUser", "admin");
var keycloakPassword = builder.AddParameter("KeycloakAdminPassword", "admin", secret: true);
var keycloak = builder.AddKeycloak("Keycloak", 8180, keycloakUser, keycloakPassword)
    .WithRealmImport("./Realms");
var realmUrl = ReferenceExpression.Create($"{keycloak.GetEndpoint("http")}/realms/{demoRealm}");

var api = builder.AddProject<DKNet_Accounts_Api>("Api")
    .WithReference(cache, "Redis")
    .WithReference(apDb, "AppDb")
    .WithReference(rabbitMq)
    .WithEnvironment("FeatureManagement__EnableServiceBus", "true")
    .WithEnvironment("MessageBus__Transport", "RabbitMq")
    // Sign-in and scope checks on, trusting only the demo realm: signature, issuer, audience and lifetime are all
    // still checked. The one relaxation, fetching the realm's keys over plain HTTP, is set here and nowhere else.
    .WithEnvironment("FeatureManagement__RequireAuthorization", "true")
    .WithEnvironment("FeatureManagement__EnableOpenTelemetry", "true")
    .WithEnvironment("Authentication__Schemes__Bearer__MetadataAddress",
        ReferenceExpression.Create($"{realmUrl}/.well-known/openid-configuration"))
    .WithEnvironment("Authentication__Schemes__Bearer__ValidIssuer", realmUrl)
    .WithEnvironment("Authentication__Schemes__Bearer__ValidAudiences__0", ledgerAudience)
    .WithEnvironment("Authentication__Schemes__Bearer__RequireHttpsMetadata", "false")
    .WaitFor(cache)
    .WaitFor(apDb)
    .WaitFor(rabbitMq)
    .WaitFor(keycloak);

// The accounts console (ui/, `pnpm dev`). Its secrets are generated once and kept in this AppHost's user secrets,
// so sessions survive a restart. The token key must be exactly 32 bytes (ui/lib/config.ts).
var sessionSecret = builder.AddParameter("ConsoleSessionSecret",
    new GenerateParameterDefault { MinLength = 32, Special = false }, secret: true, persist: true);
var tokenKey = builder.AddParameter("ConsoleTokenEncryptionKey",
    new GenerateParameterDefault { MinLength = 32, Special = false }, secret: true, persist: true);

// Port 3000 is fixed so it matches the redirect URI registered for the console's client in the demo realm.
var console = builder.AddExecutable("UI", "pnpm", "../../ui", "dev")
    .WithHttpEndpoint(port: 3000, env: "PORT")
    .WithEnvironment("CONSOLE_API_BASE_URL", api.GetEndpoint("http"))
    .WithEnvironment("CONSOLE_REDIS_URL", cache.Resource.UriExpression)
    .WithEnvironment("CONSOLE_SESSION_SECRET", sessionSecret)
    .WithEnvironment("CONSOLE_TOKEN_ENCRYPTION_KEY", tokenKey)
    // Sign-in through the demo realm (issuer = base + "/" + tenant), whatever Entra ID values ui/.env holds.
    .WithEnvironment("CONSOLE_ENTRA_ISSUER_BASE_URL", ReferenceExpression.Create($"{keycloak.GetEndpoint("http")}/realms"))
    .WithEnvironment("CONSOLE_ENTRA_TENANT_ID", demoRealm)
    .WithEnvironment("CONSOLE_ENTRA_CLIENT_ID", "dknet-accounts-console")
    .WithEnvironment("CONSOLE_ENTRA_CLIENT_SECRET", "dknet-accounts-console-demo-secret")
    .WithEnvironment("CONSOLE_ENTRA_SCOPES", "accounts.read accounts.write postings.read postings.write postings.reverse")
    // Everything else comes from ui/.env, a symlink to the root .env. Next fills a variable from it only when it is
    // not already set, so the values above win and nothing here may set a blank one.
    .WaitFor(api)
    .WaitFor(cache)
    .WaitFor(keycloak);
console.WithEnvironment("CONSOLE_BASE_URL", console.GetEndpoint("http"));

// Dev-only traffic: press ▶ on TrafficGen in the dashboard to create groups, accounts and postings through the API
// on a loop, then watch the ledger events land in the RabbitMQ management UI. Stop it with ■.
// It signs in as its own machine client of the demo realm, so its writes name that client as the calling system.
builder.AddProject<DKNet_Accounts_TrafficGen>("TrafficGen")
    .WithEnvironment("ApiBaseUrl", api.GetEndpoint("http"))
    .WithEnvironment("Auth__TokenUrl", ReferenceExpression.Create($"{realmUrl}/protocol/openid-connect/token"))
    .WithEnvironment("Auth__ClientId", "dknet-accounts-trafficgen")
    .WithEnvironment("Auth__ClientSecret", "dknet-accounts-trafficgen-demo-secret")
    .WaitFor(api)
    .WaitFor(keycloak)
    .WithExplicitStart();

await builder.Build().RunAsync();

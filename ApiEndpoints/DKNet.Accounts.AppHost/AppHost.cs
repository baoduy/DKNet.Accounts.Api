using Projects;

var builder = DistributedApplication.CreateBuilder(args);

// The database the API runs on: "Postgres" (default) or "SqlServer". Switch it here, or per run with
// `--Database:Provider SqlServer` (or the Database__Provider environment variable).
var database = builder.Configuration["Database:Provider"] ?? "Postgres";
var useSqlServer = string.Equals(database, "SqlServer", StringComparison.OrdinalIgnoreCase);

var cache = builder.AddRedis("Redis");
// The management UI (linked from the dashboard) is where the outbound ledger-events queue can be inspected.
// Fixed dev login for the management UI (not "guest": RabbitMQ only lets guest in from inside the container).
var rabbitUser = builder.AddParameter("RabbitMqUser", "admin");
var rabbitPassword = builder.AddParameter("RabbitMqPassword", "admin", secret: true);
var rabbitMq = builder.AddRabbitMQ("RabbitMq", rabbitUser, rabbitPassword)
    .WithManagementPlugin();

// pgAdmin (linked from the dashboard) comes pre-registered with the Postgres server, so the ledger tables can be
// browsed without entering a connection.
IResourceBuilder<IResourceWithConnectionString> apDb = useSqlServer
    ? builder.AddSqlServer("SqlServer").AddDatabase("AppDb")
    : builder.AddPostgres("Postgres").WithPgAdmin().AddDatabase("AppDb");

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
const int keycloakPort = 8180;
// Fixed admin screen login, set the same way as the RabbitMQ one above.
var keycloakUser = builder.AddParameter("KeycloakAdminUser", "admin");
var keycloakPassword = builder.AddParameter("KeycloakAdminPassword", "admin", secret: true);
var keycloak = builder.AddKeycloak("Keycloak", keycloakPort, keycloakUser, keycloakPassword)
    .WithRealmImport("./Realms");
var realmUrl = ReferenceExpression.Create($"{keycloak.GetEndpoint("http")}/realms/{demoRealm}");

// The local mail catcher, as in DKNet Notification's own AppHost: it takes mail over STARTTLS only, on the developer
// certificate, so Notification checks its certificate as it checks any other. Its inbox is the "http" endpoint.
var mailpit = builder.AddContainer("Mailpit", "axllent/mailpit", "v1.27")
    .WithEndpoint(targetPort: 1025, name: "smtp")
    .WithHttpEndpoint(targetPort: 8025, name: "http")
    .WithEnvironment("MP_SMTP_REQUIRE_STARTTLS", "true")
    .WithHttpsDeveloperCertificate()
    .WithHttpsCertificateConfiguration(context =>
    {
        context.EnvironmentVariables["MP_SMTP_TLS_CERT"] = context.CertificatePath;
        context.EnvironmentVariables["MP_SMTP_TLS_KEY"] = context.KeyPath;
        return Task.CompletedTask;
    });
var smtp = mailpit.GetEndpoint("smtp");

// DKNet Notification (DRK-2156): the email processor below asks it to send the welcome mail when an account is
// opened. The release image, pinned, with email on and sign-in on. It trusts only the demo realm and only tokens made
// out to its own audience, so a ledger token is refused there. The issuer is the address
// every token carries (the one the API signs in on); the keys are fetched over the container network, over plain
// HTTP when no developer certificate is trusted, the same relaxation as the API's and, like it, set only in this
// AppHost. The developer certificate is added to its trusted authorities so the STARTTLS check against Mailpit stays
// on.
const string notificationAudience = "dknet-notification-api";
// Built from the endpoint's scheme, not its host: under a trusted developer certificate Aspire serves Keycloak over
// HTTPS, and every token then names https://localhost:8180.
var keycloakScheme = keycloak.GetEndpoint("http").Property(EndpointProperty.Scheme);
var tokenIssuer = ReferenceExpression.Create($"{keycloakScheme}://localhost:{keycloakPort.ToString()}/realms/{demoRealm}");
var notification = builder.AddContainer("Notification", "ghcr.io/baoduy/dknet.notification-api", "0.0.4")
    .WithHttpEndpoint(targetPort: 8080, name: "http")
    .WithReference(cache, "Redis")
    .WithDeveloperCertificateTrust(true)
    .WithEnvironment("FeatureManagement__EnableHttps", "false")
    .WithEnvironment("FeatureManagement__RequireAuthorization", "true")
    .WithEnvironment("Authentication__Schemes__Bearer__MetadataAddress",
        ReferenceExpression.Create($"{realmUrl}/.well-known/openid-configuration"))
    .WithEnvironment("Authentication__Schemes__Bearer__ValidIssuer", tokenIssuer)
    .WithEnvironment("Authentication__Schemes__Bearer__ValidAudiences__0", notificationAudience)
    .WithEnvironment("Authentication__Schemes__Bearer__RequireHttpsMetadata", "false")
    .WithEnvironment("Notifications__Email__Enabled", "true")
    .WithEnvironment("Notifications__Email__Sender", "Smtp")
    .WithEnvironment("Notifications__Email__Smtp__Host", smtp.Property(EndpointProperty.Host))
    .WithEnvironment("Notifications__Email__Smtp__Port", smtp.Property(EndpointProperty.TargetPort))
    .WithEnvironment("Notifications__Email__Smtp__Security", "StartTls")
    .WithEnvironment("Notifications__Email__Smtp__FromAddress", "notifications@dknet-accounts.local")
    .WaitFor(cache)
    .WaitFor(keycloak)
    .WaitFor(mailpit);

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
if (useSqlServer)
{
    api.WithEnvironment("Database__Provider", "SqlServer");
}

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

// The onboarding email (DRK-2166), started with the AppHost: it reads its own copy of the ledger events (its own
// queue on the API's fanout exchange) and, for each account opened in a Customer or Merchant group, reads the group
// from the API and asks Notification for one welcome mail. It signs in as its own machine client of the demo realm,
// which holds only the send permission and read-only accounts.read, so the API refuses its token for any write.
builder.AddProject<DKNet_Accounts_EmailProcessor>("EmailProcessor")
    .WithReference(rabbitMq)
    .WithEnvironment("MessageBus__Exchange", "ledger-events")
    .WithEnvironment("MessageBus__Queue", "ledger-events.onboarding-email")
    .WithEnvironment("ApiBaseUrl", api.GetEndpoint("http"))
    .WithEnvironment("NotificationBaseUrl", notification.GetEndpoint("http"))
    .WithEnvironment("Auth__TokenUrl", ReferenceExpression.Create($"{realmUrl}/protocol/openid-connect/token"))
    .WithEnvironment("Auth__ClientId", "dknet-accounts-onboarding-email")
    .WithEnvironment("Auth__ClientSecret", "dknet-accounts-onboarding-email-demo-secret")
    .WaitFor(rabbitMq)
    .WaitFor(keycloak)
    .WaitFor(api)
    .WaitFor(notification);

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

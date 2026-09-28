using Projects;

var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("Redis");
var postgres = builder.AddPostgres("Postgres");
// The management UI (linked from the dashboard) is where the outbound ledger-events queue can be inspected.
// Fixed dev login for the management UI (not "guest": RabbitMQ only lets guest in from inside the container).
var rabbitUser = builder.AddParameter("RabbitMqUser", "admin");
var rabbitPassword = builder.AddParameter("RabbitMqPassword", "admin", secret: true);
var rabbitMq = builder.AddRabbitMQ("RabbitMq", rabbitUser, rabbitPassword)
    .WithManagementPlugin();

var apDb = postgres
    .AddDatabase("AppDb");

var api = builder.AddProject<DKNet_Accounts_Api>("Api")
    .WithReference(cache, "Redis")
    .WithReference(apDb, "AppDb")
    .WithReference(rabbitMq)
    .WithEnvironment("FeatureManagement__EnableServiceBus", "true")
    .WithEnvironment("MessageBus__Transport", "RabbitMq")
    // Auth off: ledger writes are attributed to the "System" calling system, so TrafficGen needs no token.
    .WithEnvironment("FeatureManagement__RequireAuthorization", "false")
    .WaitFor(cache)
    .WaitFor(apDb)
    .WaitFor(rabbitMq);

// The accounts console (ui/, `pnpm dev`). Its secrets are generated once and kept in this AppHost's user secrets,
// so sessions survive a restart. The token key must be exactly 32 bytes (ui/lib/config.ts).
var sessionSecret = builder.AddParameter("ConsoleSessionSecret",
    new GenerateParameterDefault { MinLength = 32, Special = false }, secret: true, persist: true);
var tokenKey = builder.AddParameter("ConsoleTokenEncryptionKey",
    new GenerateParameterDefault { MinLength = 32, Special = false }, secret: true, persist: true);

// Port 3000 is fixed so it matches the redirect URI registered for the console's Entra app.
var console = builder.AddExecutable("UI", "pnpm", "../../ui", "dev")
    .WithHttpEndpoint(port: 3000, env: "PORT")
    .WithEnvironment("CONSOLE_API_BASE_URL", api.GetEndpoint("http"))
    .WithEnvironment("CONSOLE_REDIS_URL", cache.Resource.UriExpression)
    .WithEnvironment("CONSOLE_SESSION_SECRET", sessionSecret)
    .WithEnvironment("CONSOLE_TOKEN_ENCRYPTION_KEY", tokenKey)
    // Everything else (CONSOLE_ENTRA_* etc.) comes from ui/.env, a symlink to the root .env. Next fills a variable
    // from it only when it is not already set, so the values above win and nothing here may set a blank one.
    .WaitFor(api)
    .WaitFor(cache);
console.WithEnvironment("CONSOLE_BASE_URL", console.GetEndpoint("http"));

// Dev-only traffic: press ▶ on TrafficGen in the dashboard to create groups, accounts and postings through the API
// on a loop, then watch the ledger events land in the RabbitMQ management UI. Stop it with ■.
builder.AddProject<DKNet_Accounts_TrafficGen>("TrafficGen")
    .WithEnvironment("ApiBaseUrl", api.GetEndpoint("http"))
    .WaitFor(api)
    .WithExplicitStart();

await builder.Build().RunAsync();

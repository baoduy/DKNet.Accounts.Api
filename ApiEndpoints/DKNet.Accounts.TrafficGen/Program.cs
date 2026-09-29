using DKNet.Accounts.Client;
using DKNet.Accounts.TrafficGen;

var builder = Host.CreateApplicationBuilder(args);

// ApiBaseUrl and Auth:* are set by the AppHost: the Api resource's http endpoint, and TrafficGen's machine client in
// the demo Keycloak. The ledger requires sign-in there, so every call carries that client's token.
builder.Services.AddTransient<ClientCredentialsHandler>();
builder.Services.AddAccountClient(new Uri(builder.Configuration["ApiBaseUrl"]
    ?? throw new InvalidOperationException("ApiBaseUrl is not set — run TrafficGen from the AppHost.")),
    typeof(ClientCredentialsHandler));
builder.Services.AddHostedService<TrafficWorker>();

await builder.Build().RunAsync();

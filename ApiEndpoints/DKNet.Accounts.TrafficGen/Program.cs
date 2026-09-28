using DKNet.Accounts.Client;
using DKNet.Accounts.TrafficGen;

var builder = Host.CreateApplicationBuilder(args);

// ApiBaseUrl is set by the AppHost from the Api resource's http endpoint; RequireAuthorization is off in
// Development, so no credential handler is chained.
builder.Services.AddAccountClient(new Uri(builder.Configuration["ApiBaseUrl"]
    ?? throw new InvalidOperationException("ApiBaseUrl is not set — run TrafficGen from the AppHost.")));
builder.Services.AddHostedService<TrafficWorker>();

await builder.Build().RunAsync();

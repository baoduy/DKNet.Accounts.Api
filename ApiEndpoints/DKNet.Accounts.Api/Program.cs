using DKNet.Accounts.Api.Configs;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Api.Configs.AzureAppConfig;
using SharpGrip.FluentValidation.AutoValidation.Endpoints.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Rebind features after potentially loading from Azure App Configuration
var feature = builder.Configuration.GetSection(FeatureOptions.Name).Get<FeatureOptions>() ?? new FeatureOptions();

builder.AddLogConfig(feature)
    .AddAzureAppConfig(feature)
    .AddFluentValidationConfig();

//Run migration and exit the app if needed.
await builder.RunMigrationAsync(feature, args);

// Add services to the container.
builder.Services
    .AddOptions(builder.Configuration)
    .AddAppConfig(feature, builder.Configuration)
    // Populates [FromClaim] members (e.g. ByUser) before validation and before the handler; the fallback below
    // only applies when RequireAuthorization is off, never per-caller.
    .AddContextualRequestPopulation(o => o.SystemAccountFallback = SharedConsts.SystemAccount)
    // Runs once at startup, after UseEndpointConfigs below has mapped every route, and aborts the host when a
    // declaring group left an HTTP method with no scope, per-route or otherwise (DRK-1498 §3 row 4).
    .AddGroupScopeCoverageCheck();

await builder.Build()
    .UseAppConfig(a => a.UseEndpointConfigs(o =>
    {
        o.RequireAuthorization = feature.RequireAuthorization;
        o.EnableVersioning = feature.EnableVersioning;
        o.ConfigureGroup = (group, _) => group.AddFluentValidationAutoValidation();
    }, typeof(Program).Assembly));

//This Startup endpoint for Unit Tests
namespace DKNet.Accounts.Api
{
    public class Program;
}
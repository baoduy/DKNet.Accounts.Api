using Azure.Monitor.OpenTelemetry.AspNetCore;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace DKNet.Accounts.Api.Configs;

[ExcludeFromCodeCoverage]
internal static class LogConfigs
{
    #region Methods

    public static WebApplicationBuilder AddLogConfig(this WebApplicationBuilder builder, FeatureOptions features)
    {
        if (!features.EnableOpenTelemetry)
        {
            return builder;
        }

        builder.Logging.ClearProviders();
        builder.Logging.AddOpenTelemetry(logging =>
        {
            logging.IncludeFormattedMessage = true;
            logging.IncludeScopes = true;
        });

        var otelBuilder = builder.Services.AddOpenTelemetry()
            .WithTracing(tracing =>
            {
                tracing
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();
            });

        if (!string.IsNullOrWhiteSpace(builder.Configuration.GetValue<string>("OTEL_EXPORTER_OTLP_ENDPOINT")))
        {
            otelBuilder.UseOtlpExporter();
        }

        if (!string.IsNullOrWhiteSpace(builder.Configuration.GetValue<string>("AzureMonitor:ConnectionString")))
        {
            otelBuilder.UseAzureMonitor();
        }

        return builder;
    }

    #endregion
}
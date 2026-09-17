using FluentValidation;
using Microsoft.AspNetCore.Http;
using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Api.Configs.GlobalExceptions;

namespace DKNet.Accounts.Api.Configs;

[ExcludeFromCodeCoverage]
internal static class FluentValidationConfig
{
    #region Methods

    public static WebApplicationBuilder AddFluentValidationConfig(this WebApplicationBuilder builder)
    {
        // Wires LedgerErrorResponseOptions into the FluentResults command-failure path, the FluentValidation
        // input-refusal path and the unhandled-exception path (§3 row 6/7/8) — one setting, every path.
        // IsDevelopment captured once here: ErrorResponseContext carries no HttpContext to resolve it from.
        // httpContextAccessor is captured the same way, for the same reason (DRK-1522 §3 row 6): registering
        // it is what makes the host populate it per request (ASP.NET Core's hosting layer only does so for a
        // registered IHttpContextAccessor) — registering our own captured instance, rather than relying on
        // ServiceConfigs' separate registration, keeps this wiring self-contained for hosts (this one
        // included) that never call AddAllAppServices.
        var isDevelopment = builder.Environment.IsDevelopment();
        var httpContextAccessor = new HttpContextAccessor();
        builder.Services.AddSingleton<IHttpContextAccessor>(httpContextAccessor);
        builder.Services.AddErrorResponses(options =>
        {
            options.StatusCode = LedgerErrorResponseOptions.StatusCode;
            options.UnhandledError = context =>
                LedgerErrorResponseOptions.UnhandledError(context, isDevelopment, httpContextAccessor);
        });
        builder.Services.AddValidatorsFromAssembly(typeof(AppSetup).Assembly, includeInternalTypes: true);

        return builder;
    }

    #endregion
}
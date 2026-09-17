using FluentValidation;
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
        var isDevelopment = builder.Environment.IsDevelopment();
        builder.Services.AddErrorResponses(options =>
        {
            options.StatusCode = LedgerErrorResponseOptions.StatusCode;
            options.UnhandledError = context => LedgerErrorResponseOptions.UnhandledError(context, isDevelopment);
        });
        builder.Services.AddValidatorsFromAssembly(typeof(AppSetup).Assembly, includeInternalTypes: true);

        return builder;
    }

    #endregion
}
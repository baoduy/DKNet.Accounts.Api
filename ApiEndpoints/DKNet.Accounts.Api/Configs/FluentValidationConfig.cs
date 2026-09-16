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
        // Wires LedgerErrorResponseOptions into both the FluentResults command-failure path and the
        // FluentValidation input-refusal path (§3 row 6/row 7) — one setting, both paths.
        builder.Services.AddErrorResponses(options =>
        {
            options.StatusCode = LedgerErrorResponseOptions.StatusCode;
            options.Customize = LedgerErrorResponseOptions.Customize;
        });
        builder.Services.AddValidatorsFromAssembly(typeof(AppSetup).Assembly, includeInternalTypes: true);

        return builder;
    }

    #endregion
}
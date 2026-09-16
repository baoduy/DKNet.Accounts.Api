using DKNet.AspCore.Extensions.Responses;
using DKNet.EfCore.Extensions.Serialization;
using DKNet.Accounts.AppServices.Share;
using DKNet.Accounts.Infra.Contexts;
using JsonOptions = Microsoft.AspNetCore.Http.Json.JsonOptions;

namespace DKNet.Accounts.Api.Configs;

[ExcludeFromCodeCoverage]
internal static class ServiceConfigs
{
    #region Methods

    public static IServiceCollection AddAllAppServices(
        this IServiceCollection services,
        IConfiguration configuration,
        FeatureOptions features)
    {
        services
            .AddSingleton<IHttpContextAccessor, HttpContextAccessor>()
            .AddSingleton<ISensitiveDataPrincipalAccessor, HttpContextSensitiveDataPrincipalAccessor>()
            .AddScoped<IPrincipalProvider, PrincipalProvider>()
            .AddScoped<ICallingSystemAccessor, CallingSystemAccessor>()
            // Also wires DKNet's DataOwnerHook onto CoreDbContext: it stamps CreatedBy/CreatedOn from
            // IDataOwnerProvider on save, never from a request property — a generated create request can
            // never set the acting user (DRK-715 R1).
            .AddDataOwnerProvider<CoreDbContext, PrincipalProvider>();

        services
            .AddAppServices()
            .AddInfraServices()

            //Service Bus
            .AddServiceBus(configuration, typeof(AppSetup).Assembly, features);

        // R5: global for every FluentValidation refusal — StatusCode returns null (keep today's status/body)
        // for every code but GROUP_NOT_EMPTY (DRK-1421 §3 row 3).
        services.AddErrorResponses(o =>
        {
            o.StatusCode = ctx => ctx.Errors.Any(e => e.Code == LedgerErrors.GroupNotEmpty)
                ? StatusCodes.Status422UnprocessableEntity
                : null;
            o.Customize = (problem, ctx) =>
            {
                // Only the stable LedgerErrors code, never FluentValidation's own default ErrorCode (e.g.
                // "NotEmptyValidator", set on every rule with no explicit WithErrorCode) — that default would
                // otherwise widen today's 400 body for every OTHER validator refusal (row 7).
                var code = ctx.Errors.FirstOrDefault(e => e.Code == LedgerErrors.GroupNotEmpty)?.Code;
                if (code is not null)
                {
                    problem.Extensions[LedgerErrors.CodeKey] = code;
                }
            };
        });

        return services;
    }

    public static IServiceCollection AddOptions(this IServiceCollection services, IConfiguration configuration)
    {
        // Configure core options for the application
        services.Configure<FeatureOptions>(configuration.GetSection(FeatureOptions.Name));

        services.ConfigureHttpJsonOptions(op =>
        {
            op.SerializerOptions.PropertyNamingPolicy = SharedConsts.JsonSerializerOptions.PropertyNamingPolicy;
            op.SerializerOptions.DefaultIgnoreCondition = SharedConsts.JsonSerializerOptions.DefaultIgnoreCondition;
            op.SerializerOptions.WriteIndented = SharedConsts.JsonSerializerOptions.WriteIndented;
            op.SerializerOptions.PropertyNameCaseInsensitive =
                SharedConsts.JsonSerializerOptions.PropertyNameCaseInsensitive;
            op.SerializerOptions.DictionaryKeyPolicy = SharedConsts.JsonSerializerOptions.DictionaryKeyPolicy;

            op.SerializerOptions.Converters.Clear();
            foreach (var converter in SharedConsts.JsonSerializerOptions.Converters)
            {
                op.SerializerOptions.Converters.Add(converter);
            }
        });

        // ConfigureHttpJsonOptions above has no service-provider access, so the role-aware sensitive-data
        // opt-in (needs ISensitiveDataPrincipalAccessor from DI) goes through this factory registration
        // instead — same JsonOptions instance, applied once at start-up, per the DKNet doc's recipe.
        services.AddSingleton<IConfigureOptions<JsonOptions>>(sp =>
            new ConfigureOptions<JsonOptions>(op =>
                op.SerializerOptions.UseRoleAwareSensitiveData(
                    sp.GetRequiredService<ISensitiveDataPrincipalAccessor>())));

        return services;
    }

    #endregion
}
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using AccountDto = DKNet.Accounts.AppServices.Accounts.V1.AccountDto;
using AccountBalanceDto = DKNet.Accounts.AppServices.Accounts.V1.AccountBalanceDto;
using AccountGroupDto = DKNet.Accounts.AppServices.AccountGroups.V1.AccountGroupDto;
using PostingDto = DKNet.Accounts.AppServices.Postings.V1.PostingDto;

namespace DKNet.Accounts.AppServices;

/// <summary>
///
/// </summary>
public static class AppSetup
{
    #region Methods

    /// <summary>
    ///
    /// </summary>
    /// <param name="services"></param>
    /// <returns></returns>
    public static IServiceCollection AddAppServices(this IServiceCollection services)
    {
        TypeAdapterConfig.GlobalSettings.Default.NameMatchingStrategy(NameMatchingStrategy.Flexible);
        TypeAdapterConfig.GlobalSettings.Default.MapToConstructor(true);
        TypeAdapterConfig.GlobalSettings.Default.PreserveReference(true);

        // Flexible name matching re-cases plain string dictionary keys (e.g. "region" -> "Region") as if they
        // were member names to match — metadata bags must round-trip verbatim, so map them as data, not members.
        TypeAdapterConfig<IReadOnlyDictionary<string, string>, IReadOnlyDictionary<string, string>>.NewConfig()
            .MapWith(src => src);

        // DTOs share the Domain's own enums (AGENTS.md "Domain/DTO sharing") — enum members match by name and
        // type, so ProjectToType maps them directly with no cast. Only genuine renames still need an explicit
        // map: ProjectToType silently omits an unmatched member from the SELECT list rather than erroring, so
        // the DTO field would otherwise come back null/default (DRK-1247 B1/B2).
        TypeAdapterConfig<Account, AccountDto>.NewConfig()
            .Map(dest => dest.Currency, src => src.CurrencyCode);

        TypeAdapterConfig<Account, AccountBalanceDto>.NewConfig()
            .Map(dest => dest.Currency, src => src.CurrencyCode);

        TypeAdapterConfig<Posting, PostingDto>.NewConfig()
            .Map(dest => dest.SignedAmount, src => src.SignedValue);

        TypeAdapterConfig.GlobalSettings.ScanMaps();
        TypeAdapterConfig.GlobalSettings.Compile();

        services
            .AddSingleton(TypeAdapterConfig.GlobalSettings)
            .AddScoped<IMapper, ServiceMapper>();

        return services;
    }

    #endregion
}
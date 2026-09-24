using DKNet.AspCore.Extensions.Endpoints;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using AccountDto = DKNet.Accounts.AppServices.Accounts.V1.AccountDto;
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

        // ScanMaps registers a baseline TypeAdapterConfig for every [GenerateDto]/[MapsFrom] type (AccountDto,
        // AccountGroupDto and PostingDto among them, DRK-1277) via the non-generic Type-keyed NewConfig(...)
        // overload — which, called for a (source, destination) pair a second time, resets that pair's rules.
        // The explicit renames below MUST run after it, so they are the ones left standing.
        TypeAdapterConfig.GlobalSettings.ScanMaps();

        // DTOs share the Domain's own enums (AGENTS.md "Domain/DTO sharing") — enum members match by name and
        // type, so ProjectToType maps them directly with no cast. Only genuine renames still need an explicit
        // map: ProjectToType silently omits an unmatched member from the SELECT list rather than erroring, so
        // the DTO field would otherwise come back null/default (DRK-1247 B1/B2).
        TypeAdapterConfig<Account, AccountDto>.NewConfig()
            .Map(dest => dest.Currency, src => src.CurrencyCode)
            .Map(dest => dest.AvailableBalanceAmount, src => src.AvailableBalance)
            .Map(dest => dest.AccountOpenedOn, src => src.OpenedOn);

        TypeAdapterConfig<Posting, PostingDto>.NewConfig()
            .Map(dest => dest.SignedAmount, src => src.SignedValue);

        TypeAdapterConfig.GlobalSettings.Compile();

        services
            .AddSingleton(TypeAdapterConfig.GlobalSettings)
            .AddScoped<IMapper, ServiceMapper>()
            .AddSingleton<CurrencyDecimalPlaces>();

        // The generic list endpoints (DKNet.AspCore.Extensions' MapGetList, DRK-1277 §11/§12) default to a
        // 3-month "recent activity" window on audited entities when a caller supplies neither fromDate nor
        // toDate. This ledger's bare listings must still return the caller's full history (R4: what can be
        // answered must not shrink) — disabled here instead of per-call, so every generated list route on
        // every entity gets the same "no default window" behaviour.
        services.AddListQueryOptions(options => options.DefaultActivityWindowMonths = 0);

        return services;
    }

    #endregion
}
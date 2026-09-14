using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
// AppServices declares its own DTO-facing AccountClassification/AccountStatus/AccountGroupType/AccountGroupStatus
// enums (same names, same members, kept separate from Domain on purpose) — the DTO side is aliased here so the
// Domain enum members can be referenced unaliased (plainer to read) in the explicit projection maps below.
using AccountDto = DKNet.Accounts.AppServices.Accounts.V1.AccountDto;
using AccountBalanceDto = DKNet.Accounts.AppServices.Accounts.V1.AccountBalanceDto;
using AccountClassificationDto = DKNet.Accounts.AppServices.Accounts.V1.AccountClassification;
using AccountStatusDto = DKNet.Accounts.AppServices.Accounts.V1.AccountStatus;
using AccountGroupDto = DKNet.Accounts.AppServices.AccountGroups.V1.AccountGroupDto;
using AccountGroupTypeDto = DKNet.Accounts.AppServices.AccountGroups.V1.AccountGroupType;
using AccountGroupStatusDto = DKNet.Accounts.AppServices.AccountGroups.V1.AccountGroupStatus;

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

        // These four configs exist because DKNet.EfCore.Specifications' FirstOrDefaultAsync<TEntity,TModel>/
        // ToPagedListAsync<TEntity,TModel> use Mapster's ProjectToType — an expression-tree projection EF Core
        // translates to SQL, not an in-memory Adapt. Without an explicit member map, Mapster's default
        // cross-type enum conversion compiles to a numeric cast (`(int)src.Enum`); EF pushes that down as a
        // literal `::int` cast on a column that HasConversion<string>() made text, which Postgres rejects
        // outright ("invalid input syntax for type integer"). The explicit switch expressions below compile to
        // a translatable SQL CASE instead. Renamed properties (Account.CurrencyCode -> AccountDto.Currency)
        // have the same problem one level simpler: with no explicit map, ProjectToType silently omits the
        // property from the SELECT list rather than erroring, so the DTO field comes back null.
        TypeAdapterConfig<Account, AccountDto>.NewConfig()
            .Map(dest => dest.Currency, src => src.CurrencyCode)
            .Map(dest => dest.Classification, src => src.Classification == AccountClassification.Asset
                ? AccountClassificationDto.Asset
                : src.Classification == AccountClassification.Liability
                    ? AccountClassificationDto.Liability
                    : src.Classification == AccountClassification.Equity
                        ? AccountClassificationDto.Equity
                        : src.Classification == AccountClassification.Income
                            ? AccountClassificationDto.Income
                            : AccountClassificationDto.Expense)
            .Map(dest => dest.Status, src => src.Status == AccountStatus.Active
                ? AccountStatusDto.Active
                : src.Status == AccountStatus.Frozen
                    ? AccountStatusDto.Frozen
                    : src.Status == AccountStatus.Dormant
                        ? AccountStatusDto.Dormant
                        : AccountStatusDto.Closed);

        TypeAdapterConfig<Account, AccountBalanceDto>.NewConfig()
            .Map(dest => dest.Currency, src => src.CurrencyCode);

        // Same defect, same fix, found while verifying the fix above against AccountGroup's own read paths —
        // not named in the original report, but it is the identical projection bug (DKNET review round).
        TypeAdapterConfig<AccountGroup, AccountGroupDto>.NewConfig()
            .Map(dest => dest.Type, src => src.Type == AccountGroupType.Customer
                ? AccountGroupTypeDto.Customer
                : src.Type == AccountGroupType.Merchant
                    ? AccountGroupTypeDto.Merchant
                    : src.Type == AccountGroupType.Internal
                        ? AccountGroupTypeDto.Internal
                        : src.Type == AccountGroupType.Suspense
                            ? AccountGroupTypeDto.Suspense
                            : AccountGroupTypeDto.Settlement)
            .Map(dest => dest.Status, src => src.Status == AccountGroupStatus.Active
                ? AccountGroupStatusDto.Active
                : AccountGroupStatusDto.Closed);

        TypeAdapterConfig.GlobalSettings.ScanMaps();
        TypeAdapterConfig.GlobalSettings.Compile();

        services
            .AddSingleton(TypeAdapterConfig.GlobalSettings)
            .AddScoped<IMapper, ServiceMapper>();

        return services;
    }

    #endregion
}
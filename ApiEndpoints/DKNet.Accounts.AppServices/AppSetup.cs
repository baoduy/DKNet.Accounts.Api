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

        TypeAdapterConfig.GlobalSettings.ScanMaps();
        TypeAdapterConfig.GlobalSettings.Compile();

        services
            .AddSingleton(TypeAdapterConfig.GlobalSettings)
            .AddScoped<IMapper, ServiceMapper>();

        return services;
    }

    #endregion
}
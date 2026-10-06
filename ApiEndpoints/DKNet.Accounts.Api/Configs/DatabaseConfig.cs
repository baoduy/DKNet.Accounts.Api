namespace DKNet.Accounts.Api.Configs;

/// <summary>
/// Chooses the database the service runs on from <see cref="SharedConsts.DatabaseProviderKey"/>.
/// </summary>
[ExcludeFromCodeCoverage]
internal static class DatabaseConfig
{
    #region Methods

    /// <summary>
    /// Reads the database setting: <c>Postgres</c> or <c>SqlServer</c>, compared without regard to case; absent
    /// means <see cref="DatabaseProvider.Postgres"/>; any other value throws <see cref="InvalidOperationException"/>.
    /// </summary>
    public static DatabaseProvider ResolveProvider(IConfiguration configuration) =>
        throw new NotImplementedException();

    #endregion
}

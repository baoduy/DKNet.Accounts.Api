namespace DKNet.Accounts.Share;

/// <summary>
///     The database the service runs on, chosen once at startup from <see cref="SharedConsts.DatabaseProviderKey"/>.
/// </summary>
public enum DatabaseProvider
{
    /// <summary>PostgreSQL — the default when the setting is absent.</summary>
    Postgres,

    /// <summary>Microsoft SQL Server.</summary>
    SqlServer
}

namespace DKNet.Accounts.Share.Options;

/// <summary>
///     The onboarding email settings (section <c>OnboardingEmail</c>, DRK-2156): where DKNet Notification and the
///     token endpoint are, the service client the token is asked for, and the queue the email feature reads its
///     copy of the ledger events from. Read only when <see cref="FeatureOptions.EnableOnboardingEmail" /> is on and
///     the outbound bus is on over RabbitMQ. No appsettings file carries them: the AppHost sets them.
/// </summary>
public sealed class OnboardingEmailOptions
{
    #region Properties

    /// <summary>Gets or sets the DKNet Notification address. Required when the feature is on.</summary>
    public Uri? NotificationBaseUrl { get; set; }

    /// <summary>Gets or sets the client-credentials token endpoint of the sign-in realm.</summary>
    public Uri? TokenUrl { get; set; }

    /// <summary>Gets or sets the service client the token is issued to.</summary>
    public string? ClientId { get; set; }

    /// <summary>Gets or sets the service client's secret. Never logged.</summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    ///     Gets or sets the queue the email feature reads from, bound to the outbound exchange. Default is
    ///     <c>ledger-events.onboarding-email</c>.
    /// </summary>
    public string Queue { get; set; } = "ledger-events.onboarding-email";

    /// <summary>Gets the configuration section name for the onboarding email.</summary>
    public static string Name => "OnboardingEmail";

    #endregion
}

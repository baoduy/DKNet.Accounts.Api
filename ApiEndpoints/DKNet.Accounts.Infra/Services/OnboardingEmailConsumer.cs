using System.Text.RegularExpressions;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Infra.Contexts;
using DKNet.Notification.Client;
using Microsoft.Extensions.Logging;
using SlimMessageBus;

namespace DKNet.Accounts.Infra.Services;

/// <summary>
///     Reads the email feature's own copy of the ledger events (DRK-2156) and asks DKNet Notification for one
///     onboarding email per account opened in a Customer or Merchant group (R1, R2). The recipient and the
///     customer name are fakes derived from the account id, so a redelivery builds the same request (R3), sent under
///     the key <c>onboarding-email-&lt;accountNumber&gt;</c> that DKNet Notification replays (R4). A failure is
///     logged once and the message acknowledged: this never throws, so nothing is requeued or retried (R6).
/// </summary>
internal sealed partial class OnboardingEmailConsumer(
    CoreDbContext db,
    INotificationClient notifications,
    ILogger<OnboardingEmailConsumer> logger) : IConsumer<OutboundEnvelope>
{
    private const string AccountCreated = "accounts.created";

    private static readonly string[] FirstNames =
    [
        "Avery", "Blake", "Casey", "Devon", "Emery", "Finley", "Harper", "Jordan",
        "Kendall", "Logan", "Morgan", "Parker", "Quinn", "Riley", "Rowan", "Taylor"
    ];

    private static readonly string[] LastNames =
    [
        "Ashford", "Brook", "Carver", "Dale", "Ellison", "Fairley", "Grant", "Hale",
        "Irwin", "Keller", "Lowe", "Marsh", "Norris", "Pryce", "Sloane", "Wren"
    ];

    public async Task OnHandle(OutboundEnvelope message, CancellationToken cancellationToken)
    {
        if (message.Type != AccountCreated) return;

        string? accountNumber = null;
        try
        {
            var payload = message.Payload;
            accountNumber = payload.GetProperty("accountNumber").GetString()!;
            var groupId = payload.GetProperty("groupId").GetGuid();

            var groupType = await db.Set<AccountGroup>().AsNoTracking()
                .Where(g => g.Id == groupId)
                .Select(g => (AccountGroupType?)g.Type)
                .FirstOrDefaultAsync(cancellationToken);
            if (groupType is null)
            {
                LogGroupNotFound(accountNumber, groupId);
                return;
            }

            // Allow-list: a group type added later gets no email until it is named here.
            if (groupType is not (AccountGroupType.Customer or AccountGroupType.Merchant)) return;

            await notifications.SendAsync(
                Request(payload.GetProperty("id").GetGuid(), accountNumber),
                IdempotencyKey(accountNumber),
                cancellationToken);
            LogRequested(accountNumber);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Host shutdown, not a failed request: nothing to report.
        }
        catch (NotificationApiException e)
        {
            LogRefused(accountNumber, (int)e.StatusCode);
        }
#pragma warning disable CA1031 // R6: any failure is logged once and swallowed, so the message is never requeued.
        catch (Exception e)
#pragma warning restore CA1031
        {
            LogFailed(accountNumber, e.GetType().Name, e.Message);
        }
    }

    /// <summary>R3: the name and address are picked by the account id's bytes, never looked up or stored.</summary>
    private static SendNotificationRequest Request(Guid accountId, string accountNumber)
    {
        var bytes = accountId.ToByteArray();
        var first = FirstNames[bytes[0] % FirstNames.Length];
        var last = LastNames[bytes[1] % LastNames.Length];
        var to = $"{first}.{last}.{Convert.ToHexStringLower(bytes, 2, 4)}@example.com".ToLowerInvariant();

        return new SendNotificationRequest("email", "account-opened", new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["to"] = to,
            ["customerName"] = $"{first} {last}",
            ["accountNumber"] = accountNumber
        });
    }

    // ponytail: two account numbers differing only in a replaced character share a key and so one email within
    // DKNet Notification's 4-hour replay window; encode the replaced characters if that ever matters.
    private static string IdempotencyKey(string accountNumber) =>
        $"onboarding-email-{NotKeySafe().Replace(accountNumber, "-")}";

    [LoggerMessage(Level = LogLevel.Information, Message = "Onboarding email requested for account {AccountNumber}.")]
    private partial void LogRequested(string accountNumber);

    [LoggerMessage(Level = LogLevel.Warning,
        Message = "No onboarding email for account {AccountNumber}: account group {GroupId} was not found.")]
    private partial void LogGroupNotFound(string accountNumber, Guid groupId);

    [LoggerMessage(Level = LogLevel.Error,
        Message = "Onboarding email request for account {AccountNumber} failed: status {StatusCode}.")]
    private partial void LogRefused(string? accountNumber, int statusCode);

    [LoggerMessage(Level = LogLevel.Error,
        Message = "Onboarding email request for account {AccountNumber} failed: {Reason}: {Detail}")]
    private partial void LogFailed(string? accountNumber, string reason, string detail);

    [GeneratedRegex("[^A-Za-z0-9-]")]
    private static partial Regex NotKeySafe();
}

using System.Net;
using System.Text.RegularExpressions;
using DKNet.Accounts.Client;
using DKNet.Accounts.Client.Contracts;
using DKNet.Notification.Client;
using SlimMessageBus;

namespace DKNet.Accounts.EmailProcessor;

/// <summary>
///     Reads the email processor's own copy of the ledger events (DRK-2166) and asks DKNet Notification for one
///     onboarding email per account opened in a Customer or Merchant group (R1), the group type read from the Accounts
///     API. The recipient and the customer name are fakes derived from the account id (R7), so a redelivery builds the
///     same request, sent under the key <c>onboarding-email-&lt;accountNumber&gt;</c> that DKNet Notification replays
///     (R5). A failed group read or request is logged once as an error and the message acknowledged: this never throws,
///     so nothing is requeued or retried (R2, R3, R4).
/// </summary>
internal sealed partial class OnboardingEmailConsumer(
    IAccountClient accounts,
    INotificationClient notifications,
    ILogger<OnboardingEmailConsumer> logger) : IConsumer<LedgerEvent>
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

    public async Task OnHandle(LedgerEvent message, CancellationToken cancellationToken)
    {
        if (message.Type != AccountCreated) return;

        string? accountNumber = null;
        var step = "group read";
        try
        {
            var payload = message.Payload;
            accountNumber = payload.GetProperty("accountNumber").GetString()!;
            var group = await accounts.GetAccountGroupAsync(payload.GetProperty("groupId").GetGuid(), cancellationToken);

            // Allow-list: a group type added later gets no email until it is named here.
            if (group.Type is not (AccountGroupType.Customer or AccountGroupType.Merchant)) return;

            step = "onboarding email request";
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
        catch (AccountApiException e)
        {
            LogRefused(accountNumber, step, e.StatusCode);
        }
        catch (NotificationApiException e)
        {
            LogRefused(accountNumber, step, e.StatusCode);
        }
        catch (Exception e)
        {
            // Any other failure (unreachable, timeout, an unreadable answer) is logged once and swallowed, so the
            // message is never requeued.
            LogFailed(accountNumber, step, e.GetType().Name, e.Message);
        }
    }

    /// <summary>R7: the name and address are picked by the account id's bytes, never looked up or stored.</summary>
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

    [LoggerMessage(Level = LogLevel.Error,
        Message = "No onboarding email for account {AccountNumber}: the {Step} was refused with status {StatusCode}.")]
    private partial void LogRefused(string? accountNumber, string step, HttpStatusCode statusCode);

    [LoggerMessage(Level = LogLevel.Error,
        Message = "No onboarding email for account {AccountNumber}: the {Step} failed: {Reason}: {Detail}")]
    private partial void LogFailed(string? accountNumber, string step, string reason, string detail);

    [GeneratedRegex("[^A-Za-z0-9-]")]
    private static partial Regex NotKeySafe();
}

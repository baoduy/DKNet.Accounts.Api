using System.Net;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Domains.Share;
using DKNet.EfCore.Extensions.Configurations;
using DKNet.Accounts.Infra.Contexts;
using DKNet.Accounts.Infra.Services;
using DKNet.Notification.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DKNet.Accounts.App.Tests.Unit.Services;

/// <summary>
/// DRK-2156 §6 R1–R4, R6 and §6a D3, D4, D7 at the consumer: the envelope types it ignores, a missing group, the
/// fake recipient, the idempotency key, and every failure of the call logged once and swallowed. The
/// customer/merchant/internal rows run end to end in <c>OnboardingEmail.feature</c>; they are repeated here so the
/// allow-list is pinned without a broker.
/// </summary>
public sealed class OnboardingEmailConsumerTests : IDisposable
{
    private static readonly Guid AccountId = Guid.Parse("0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0");
    private const string AccountNumber = "ACME-0000000001";

    private readonly CoreDbContext _db = new(
        new DbContextOptionsBuilder<CoreDbContext>()
            .UseInMemoryDatabase($"onboarding-{Guid.NewGuid():N}")
            .UseAutoConfigModel([typeof(CoreDbContext).Assembly, typeof(Sequences).Assembly])
            .Options);

    private readonly FakeNotificationClient _notifications = new();
    private readonly TestLogCapture _logs = new();
    private readonly ILoggerFactory _loggerFactory;

    public OnboardingEmailConsumerTests() =>
        _loggerFactory = LoggerFactory.Create(b => b.SetMinimumLevel(LogLevel.Trace).AddProvider(_logs));

    public void Dispose()
    {
        _db.Dispose();
        _loggerFactory.Dispose();
    }

    #region Rules

    [Theory]
    [InlineData(AccountGroupType.Customer)]
    [InlineData(AccountGroupType.Merchant)]
    public async Task AnAccountInACustomerOrMerchantGroup_RequestsOneOnboardingEmail(AccountGroupType type)
    {
        var groupId = await SeedGroupAsync(type);

        await Consumer().OnHandle(AccountCreated(groupId), CancellationToken.None);

        var sent = _notifications.Sent.ShouldHaveSingleItem();
        sent.Request.Channel.ShouldBe("email");
        sent.Request.TemplateId.ShouldBe("account-opened");
        sent.Request.Parameters["accountNumber"].ShouldBe(AccountNumber);
        sent.IdempotencyKey.ShouldBe("onboarding-email-ACME-0000000001");
        _logs.Entries.ShouldNotContain(e => e.Level >= LogLevel.Warning);
    }

    [Theory]
    [InlineData(AccountGroupType.Internal)]
    [InlineData(AccountGroupType.Suspense)]
    [InlineData(AccountGroupType.Settlement)]
    public async Task AnAccountInAnInternalGroup_RequestsNothing(AccountGroupType type)
    {
        var groupId = await SeedGroupAsync(type);

        await Consumer().OnHandle(AccountCreated(groupId), CancellationToken.None);

        _notifications.Sent.ShouldBeEmpty();
        _logs.Entries.ShouldNotContain(e => e.Level >= LogLevel.Warning);
    }

    /// <summary>D4: every other §3a event type is acknowledged with no call and no log above Debug.</summary>
    [Theory]
    [InlineData("currencies.created")]
    [InlineData("currencies.updated")]
    [InlineData("account-groups.created")]
    [InlineData("account-groups.updated")]
    [InlineData("account-groups.deleted")]
    [InlineData("accounts.updated")]
    [InlineData("postings.created")]
    [InlineData("postings.updated")]
    public async Task AnyOtherEventType_RequestsNothing_AndLogsNothingAboveDebug(string type)
    {
        // The payload would qualify if it were an accounts.created event: only the type keeps it out.
        var groupId = await SeedGroupAsync(AccountGroupType.Customer);

        await Consumer().OnHandle(AccountCreated(groupId) with { Type = type }, CancellationToken.None);

        _notifications.Sent.ShouldBeEmpty();
        _logs.Entries.ShouldNotContain(e => e.Level > LogLevel.Debug);
    }

    /// <summary>D3: a group that cannot be found requests nothing and writes one Warning.</summary>
    [Fact]
    public async Task AGroupThatIsNotFound_RequestsNothing_AndLogsOneWarning()
    {
        var missing = Guid.Parse("99999999-0000-0000-0000-000000000001");

        await Consumer().OnHandle(AccountCreated(missing), CancellationToken.None);

        _notifications.Sent.ShouldBeEmpty();
        var warning = _logs.Entries.Where(e => e.Level >= LogLevel.Warning).ShouldHaveSingleItem();
        warning.Level.ShouldBe(LogLevel.Warning);
        warning.Message.ShouldBe(
            "No onboarding email for account ACME-0000000001: account group 99999999-0000-0000-0000-000000000001 was not found.");
    }

    /// <summary>R3: the fakes come from the account id alone, so a redelivery builds the same request.</summary>
    [Fact]
    public async Task TheRecipientAndName_AreFakesSeededFromTheAccountId()
    {
        var groupId = await SeedGroupAsync(AccountGroupType.Customer);
        var consumer = Consumer();

        await consumer.OnHandle(AccountCreated(groupId), CancellationToken.None);
        await consumer.OnHandle(AccountCreated(groupId), CancellationToken.None);
        await consumer.OnHandle(AccountCreated(groupId, Guid.Parse("f0e9d8c7-b6a5-9483-7261-504f3e2d1c0b")),
            CancellationToken.None);

        _notifications.Sent.Count.ShouldBe(3);
        var (first, again, other) = (_notifications.Sent[0], _notifications.Sent[1], _notifications.Sent[2]);
        again.Request.Parameters.ShouldBe(first.Request.Parameters);
        again.IdempotencyKey.ShouldBe(first.IdempotencyKey);

        var to = first.Request.Parameters["to"];
        to.ShouldEndWith("@example.com");
        to.ShouldMatch(@"^[a-z]+\.[a-z]+\.[0-9a-f]{8}@example\.com$");
        first.Request.Parameters["customerName"].ShouldMatch("^[A-Z][a-z]+ [A-Z][a-z]+$");
        first.Request.Parameters.Keys.Order().ShouldBe(["accountNumber", "customerName", "to"]);

        other.Request.Parameters["to"].ShouldNotBe(to);
    }

    /// <summary>R4: the key keeps letters, digits and <c>-</c> only.</summary>
    [Theory]
    [InlineData("ACME-0000000001", "onboarding-email-ACME-0000000001")]
    [InlineData("KOPI-AB 12/x", "onboarding-email-KOPI-AB-12-x")]
    [InlineData("OPS_1.2", "onboarding-email-OPS-1-2")]
    public async Task TheIdempotencyKey_KeepsLettersDigitsAndHyphensOnly(string accountNumber, string expectedKey)
    {
        var groupId = await SeedGroupAsync(AccountGroupType.Merchant);

        await Consumer().OnHandle(AccountCreated(groupId, accountNumber: accountNumber), CancellationToken.None);

        _notifications.Sent.ShouldHaveSingleItem().IdempotencyKey.ShouldBe(expectedKey);
    }

    #endregion

    #region Failures

    /// <summary>D5–D7: each failure of the call is one Error naming the account and the reason, and no throw.</summary>
    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, "status 401")]
    [InlineData(HttpStatusCode.Forbidden, "status 403")]
    [InlineData(HttpStatusCode.Conflict, "status 409")]
    [InlineData(HttpStatusCode.ServiceUnavailable, "status 503")]
    public async Task ARefusedRequest_IsLoggedOnce_AndNotRetried(HttpStatusCode status, string reason)
    {
        var groupId = await SeedGroupAsync(AccountGroupType.Customer);
        _notifications.Failure = new NotificationApiException(status, [], $"refused {(int)status}");

        await Consumer().OnHandle(AccountCreated(groupId), CancellationToken.None);

        _notifications.Attempts.ShouldBe(1);
        _logs.Entries.Where(e => e.Level >= LogLevel.Warning).ShouldHaveSingleItem().ShouldBe(
            new TestLogCapture.Entry(LogLevel.Error, $"Onboarding email request for account ACME-0000000001 failed: {reason}."));
    }

    [Fact]
    public async Task AnUnreachableService_IsLoggedOnce_AndNotRetried()
    {
        var groupId = await SeedGroupAsync(AccountGroupType.Customer);
        _notifications.Failure = new HttpRequestException("Connection refused (notification:8080)");

        await Consumer().OnHandle(AccountCreated(groupId), CancellationToken.None);

        _notifications.Attempts.ShouldBe(1);
        _logs.Entries.Where(e => e.Level >= LogLevel.Warning).ShouldHaveSingleItem().ShouldBe(new TestLogCapture.Entry(
            LogLevel.Error,
            "Onboarding email request for account ACME-0000000001 failed: HttpRequestException: " +
            "Connection refused (notification:8080)"));
    }

    [Fact]
    public async Task ATimeout_IsLoggedOnce_AndNotRetried()
    {
        var groupId = await SeedGroupAsync(AccountGroupType.Customer);
        _notifications.Failure = new TaskCanceledException("The request timed out.");

        await Consumer().OnHandle(AccountCreated(groupId), CancellationToken.None);

        _notifications.Attempts.ShouldBe(1);
        _logs.Entries.Where(e => e.Level >= LogLevel.Warning).ShouldHaveSingleItem().ShouldBe(new TestLogCapture.Entry(
            LogLevel.Error,
            "Onboarding email request for account ACME-0000000001 failed: TaskCanceledException: " +
            "The request timed out."));
    }

    /// <summary>R6: host shutdown cancels the call; that is not a failure of the request.</summary>
    [Fact]
    public async Task HostShutdown_IsNotLoggedAsAFailure()
    {
        var groupId = await SeedGroupAsync(AccountGroupType.Customer);
        using var shutdown = new CancellationTokenSource();
        await shutdown.CancelAsync();
        _notifications.Failure = new TaskCanceledException("The operation was canceled.");

        await Consumer().OnHandle(AccountCreated(groupId), shutdown.Token);

        _logs.Entries.ShouldNotContain(e => e.Level >= LogLevel.Warning);
    }

    #endregion

    #region Helpers

    private OnboardingEmailConsumer Consumer() =>
        new(_db, _notifications, _loggerFactory.CreateLogger<OnboardingEmailConsumer>());

    private async Task<Guid> SeedGroupAsync(AccountGroupType type)
    {
        var group = new AccountGroup("ACME", "Acme Retail", null, type, "PayHub", null);
        _db.Add(group).Property("CreatedBy").CurrentValue = "seed";
        await _db.SaveChangesAsync();
        return group.Id;
    }

    private static OutboundEnvelope AccountCreated(Guid groupId, Guid? accountId = null,
        string accountNumber = AccountNumber) =>
        new("accounts.created", JsonSerializer.SerializeToElement(new
        {
            id = accountId ?? AccountId,
            accountNumber,
            groupId,
            name = "Main Wallet",
            currencyCode = "EUR"
        }));

    #endregion

    /// <summary>The Notification client, faked at its port: records each call, fails as told.</summary>
    private sealed class FakeNotificationClient : INotificationClient
    {
        public List<(SendNotificationRequest Request, string? IdempotencyKey)> Sent { get; } = [];

        public int Attempts { get; private set; }

        public Exception? Failure { get; set; }

        public Task<SendNotificationResponse> SendAsync(SendNotificationRequest request, string? idempotencyKey,
            CancellationToken cancellationToken = default)
        {
            Attempts++;
            if (Failure is not null) throw Failure;
            Sent.Add((request, idempotencyKey));
            return Task.FromResult(new SendNotificationResponse(Guid.NewGuid()));
        }

        public Task<NotificationStatusResponse> GetStatusAsync(Guid notificationId,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }
}

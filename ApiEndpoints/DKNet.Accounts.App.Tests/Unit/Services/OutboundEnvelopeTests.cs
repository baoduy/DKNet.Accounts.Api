using DKNet.Accounts.AppServices;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Features.Currencies.Entities;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Infra.Services;

namespace DKNet.Accounts.App.Tests.Unit.Services;

/// <summary>
/// DRK-1773 §3a, pinned per payload: each declared event is mapped from its entity the way the DKNet save hook maps
/// it (the app's <see cref="IMapper"/>), wrapped, and must carry exactly its §3a type string and field set.
/// </summary>
public sealed class OutboundEnvelopeTests
{
    private static readonly string[] AuditFields = ["createdBy", "createdOn", "updatedBy", "updatedOn"];

    private static readonly string[] CurrencyFields = ["id", "code", "name", "decimalPlaces", "isActive"];

    private static readonly string[] AccountGroupFields =
        ["id", "code", "name", "description", "type", "status", "ownerId"];

    private static readonly string[] AccountFields =
    [
        "id", "accountNumber", "groupId", "name", "currencyCode", "classification", "status", "balance",
        "heldAmount", "overdraftLimit", "minimumBalance", "permittedToGoNegative", "streamPosition", "lastPostedOn",
        "externalReference", "closedOn"
    ];

    private static readonly string[] PostingFields =
    [
        "id", "accountId", "postingNumber", "streamPosition", "direction", "amount", "currency", "signedValue",
        "balanceAfter", "effectiveDate", "recordedAt", "category", "status", "reversedByPostingId",
        "reversesPostingId", "transactionGroupId", "counterpartyAccountId", "counterpartyReference", "callingSystem",
        "idempotencyKey", "externalReference", "description"
    ];

    private static readonly IMapper Mapper =
        new ServiceCollection().AddAppServices().BuildServiceProvider().GetRequiredService<IMapper>();

    #region Methods

    public static TheoryData<Type, string> EventTypes => new()
    {
        { typeof(CurrencyCreatedEvent), "currencies.created" },
        { typeof(CurrencyUpdatedEvent), "currencies.updated" },
        { typeof(AccountGroupCreatedEvent), "account-groups.created" },
        { typeof(AccountGroupUpdatedEvent), "account-groups.updated" },
        { typeof(AccountGroupDeletedEvent), "account-groups.deleted" },
        { typeof(AccountCreatedEvent), "accounts.created" },
        {
            typeof(AccountClosedOnExternalReferenceMinimumBalanceNameOverdraftLimitPermittedToGoNegativeStatusUpdatedEvent),
            "accounts.updated"
        },
        { typeof(PostingCreatedEvent), "postings.created" },
        { typeof(PostingStatusUpdatedEvent), "postings.updated" }
    };

    [Theory]
    [MemberData(nameof(EventTypes))]
    public void EachDeclaredEvent_IsWrappedAsItsEventType_WithItsExactFieldSet(Type eventType, string expectedType)
    {
        var (entity, fields) = EntityFor(eventType);

        OutboundEnvelope.TryWrap(Mapper.Map(entity, entity.GetType(), eventType), out var envelope).ShouldBeTrue();

        envelope!.Type.ShouldBe(expectedType);
        envelope.Payload.EnumerateObject().Select(p => p.Name).Order()
            .ShouldBe(fields.Concat(AuditFields).Order());
    }

    [Fact]
    public void APostingPayload_NeverCarriesTheIdempotencySignature_WhileItCarriesTheKey()
    {
        OutboundEnvelope.TryWrap(Mapper.Map<PostingCreatedEvent>(NewPosting()), out var envelope).ShouldBeTrue();

        envelope!.Payload.GetProperty("idempotencyKey").GetString().ShouldBe("pay-2026-0001");
        envelope.Payload.TryGetProperty("idempotencySignature", out _).ShouldBeFalse();
    }

    [Fact]
    public void APayload_UsesTheHttpApiFormat_CamelCaseEnumNamesAndEntityFieldNames()
    {
        OutboundEnvelope.TryWrap(Mapper.Map<AccountCreatedEvent>(NewAccount()), out var envelope).ShouldBeTrue();

        envelope!.Payload.GetProperty("classification").GetString().ShouldBe("liability");
        envelope.Payload.GetProperty("status").GetString().ShouldBe("active");
        envelope.Payload.GetProperty("currencyCode").GetString().ShouldBe("SGD");
        envelope.Payload.TryGetProperty("metadata", out _).ShouldBeFalse();
    }

    [Fact]
    public void AnEventThatIsNotAnOutboundEvent_IsNotWrapped()
    {
        OutboundEnvelope.TryWrap(new { Name = "internal" }, out var envelope).ShouldBeFalse();
        envelope.ShouldBeNull();
    }

    private static (object Entity, string[] Fields) EntityFor(Type eventType) =>
        eventType.Name switch
        {
            _ when eventType.Name.StartsWith(nameof(Currency), StringComparison.Ordinal) =>
                (new Currency("SGD", "Singapore dollar", 2), CurrencyFields),
            _ when eventType.Name.StartsWith(nameof(AccountGroup), StringComparison.Ordinal) =>
                (new AccountGroup("OPSSG", "Ops SG", "Operations", AccountGroupType.Internal, "PayHub", Metadata()),
                    AccountGroupFields),
            _ when eventType.Name.StartsWith(nameof(Account), StringComparison.Ordinal) => (NewAccount(), AccountFields),
            _ => (NewPosting(), PostingFields)
        };

    private static Dictionary<string, string> Metadata() => new() { ["Team"] = "Treasury" };

    private static Account NewAccount() =>
        new(Guid.NewGuid(), "OPSSG-0000000001", "Ops float", "SGD", AccountClassification.Liability, true, 500m, null,
            "ext-1", Metadata());

    private static Posting NewPosting() =>
        new(Guid.NewGuid(), "P-0000000001", 1, PostingDirection.Credit, 100m, "SGD", 100m, 100m,
            new DateOnly(2026, 9, 28), DateTimeOffset.UtcNow, PostingCategory.Transfer, Guid.NewGuid(), Guid.NewGuid(),
            "cp-1", "PayHub", "pay-2026-0001", "signature", "ext-1", "Ops funding", Metadata());

    #endregion
}

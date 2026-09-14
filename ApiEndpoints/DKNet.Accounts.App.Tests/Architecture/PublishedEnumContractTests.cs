using DKNet.Accounts.AppServices.AccountGroups.V1;
using DKNet.Accounts.AppServices.Accounts.V1;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.App.Tests.Architecture;

/// <summary>
/// Pins the published wire contract of every enum a DTO shares directly with the Domain (DRK-1268 —
/// AppSetup.cs no longer maps a DTO-local enum copy onto these, so the Domain enum's member names ARE the
/// JSON contract via <see cref="Share.SharedConsts.JsonSerializerOptions"/>'s
/// <c>JsonStringEnumConverter(JsonNamingPolicy.CamelCase)</c>). Expected member sets are literals copied from
/// the approved spec, never read back off the enum itself, so renaming, removing or adding a member turns
/// this suite red for a nameable reason (R2) instead of trivially passing.
/// </summary>
public class PublishedEnumContractTests
{
    private static string CamelCase(string member) => JsonNamingPolicy.CamelCase.ConvertName(member);

    private static void AssertPublishedEnumContract(
        Type dtoType, string propertyName, Type expectedEnumType, string[] expectedMembers)
    {
        var property = dtoType.GetProperty(propertyName)
            ?? throw new InvalidOperationException($"{dtoType.Name} has no property named '{propertyName}'.");
        var propertyType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;

        propertyType.ShouldBe(expectedEnumType,
            $"{dtoType.Name}.{propertyName} must publish the Domain enum {expectedEnumType.FullName} " +
            "directly (AGENTS.md \"Domain and DTO sharing\") — a DTO-local copy is the DRK-1247 B1 defect.");

        var actualMembers = Enum.GetNames(propertyType)
            .Select(CamelCase)
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToArray();
        var expectedCamelMembers = expectedMembers
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToArray();

        actualMembers.ShouldBe(expectedCamelMembers,
            $"{expectedEnumType.Name}'s published member set changed — every DTO exposing it changes its " +
            "JSON silently. Treat this as a contract break to escalate (R2), never as a test to update.");
    }

    [Fact]
    public void PostingDto_Direction_PublishesExactlyCreditAndDebit() =>
        AssertPublishedEnumContract(typeof(PostingDto), nameof(PostingDto.Direction), typeof(PostingDirection),
            ["credit", "debit"]);

    [Fact]
    public void PostingDto_Category_PublishesTheEightApprovedCategories() =>
        AssertPublishedEnumContract(typeof(PostingDto), nameof(PostingDto.Category), typeof(PostingCategory),
            ["transfer", "payment", "fee", "interest", "adjustment", "refund", "reversal", "openingBalance"]);

    [Fact]
    public void PostingDto_Status_PublishesExactlyPostedAndReversed() =>
        AssertPublishedEnumContract(typeof(PostingDto), nameof(PostingDto.Status), typeof(PostingStatus),
            ["posted", "reversed"]);

    [Fact]
    public void AccountDto_Classification_PublishesTheFiveApprovedClassifications() =>
        AssertPublishedEnumContract(
            typeof(AccountDto), nameof(AccountDto.Classification), typeof(AccountClassification),
            ["asset", "liability", "equity", "income", "expense"]);

    [Fact]
    public void AccountDto_Status_PublishesTheFourApprovedStatuses() =>
        AssertPublishedEnumContract(typeof(AccountDto), nameof(AccountDto.Status), typeof(AccountStatus),
            ["active", "frozen", "dormant", "closed"]);

    [Fact]
    public void AccountGroupDto_Type_PublishesTheFiveApprovedTypes() =>
        AssertPublishedEnumContract(
            typeof(AccountGroupDto), nameof(AccountGroupDto.Type), typeof(AccountGroupType),
            ["customer", "merchant", "internal", "suspense", "settlement"]);

    [Fact]
    public void AccountGroupDto_Status_PublishesExactlyActiveAndClosed() =>
        AssertPublishedEnumContract(
            typeof(AccountGroupDto), nameof(AccountGroupDto.Status), typeof(AccountGroupStatus),
            ["active", "closed"]);
}

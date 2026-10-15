using System.Reflection;
using FluentResults;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Unit.Share;

public class LedgerErrorsTests
{
    [Fact]
    public void RefusalCodes_DoNotIncludeGroupCycle()
    {
        var codes = typeof(LedgerErrors)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(f => f.IsLiteral && f.FieldType == typeof(string))
            .Select(f => (string)f.GetRawConstantValue()!);

        codes.ShouldNotContain("GROUP_CYCLE");
    }

    [Fact]
    public void Replayed_MarksTheSuccessWithTheReplayedMetadataSetToTrue()
    {
        var result = LedgerErrors.Replayed("value");

        var success = result.Successes.ShouldHaveSingleItem();
        success.Message.ShouldBe("Idempotent replay of a previously recorded request.");
        success.Metadata[LedgerErrors.ReplayedKey].ShouldBe(true);
    }

    [Fact]
    public void IsReplayed_IsFalse_ForAFreshSuccessfulResult()
    {
        Result.Ok("value").IsReplayed().ShouldBeFalse();
    }

    /// <summary>DRK-2276 §3a: the transfer refusal codes are the spec's literals, character for character.</summary>
    [Fact]
    public void TransferCodes_AreTheSpecsLiterals()
    {
        string[] codes =
        [
            LedgerErrors.SameAccountTransfer, LedgerErrors.ExchangeRateRequired, LedgerErrors.ExchangeRateNotAllowed,
            LedgerErrors.InvalidExchangeRate, LedgerErrors.InvalidFee, LedgerErrors.FeeAccountRequired,
            LedgerErrors.InvalidFeeAccount, LedgerErrors.ConvertedAmountTooSmall
        ];

        codes.ShouldBe(
        [
            "SAME_ACCOUNT_TRANSFER", "EXCHANGE_RATE_REQUIRED", "EXCHANGE_RATE_NOT_ALLOWED", "INVALID_EXCHANGE_RATE",
            "INVALID_FEE", "FEE_ACCOUNT_REQUIRED", "INVALID_FEE_ACCOUNT", "CONVERTED_AMOUNT_TOO_SMALL"
        ]);
    }
}

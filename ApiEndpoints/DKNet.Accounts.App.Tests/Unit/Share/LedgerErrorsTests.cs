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
}

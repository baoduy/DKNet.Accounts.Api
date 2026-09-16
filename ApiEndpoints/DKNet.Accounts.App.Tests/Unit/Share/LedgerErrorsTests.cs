using System.Reflection;
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
}

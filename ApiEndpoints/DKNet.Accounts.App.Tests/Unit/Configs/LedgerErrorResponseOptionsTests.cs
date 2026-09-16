using System.Reflection;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.Share;

namespace DKNet.Accounts.App.Tests.Unit.Configs;

/// <summary>
/// Parity check for <see cref="LedgerErrorResponseOptions.KnownCodes"/>, hand-restated rather than reflected
/// (a new <see cref="LedgerErrors"/> code needing a status other than 422 — like
/// <see cref="LedgerErrors.IdempotencyKeyConflict"/>'s 409 — must stay a deliberate exclusion, not something a
/// blanket reflection-derived set would silently sweep in). This test is what makes an unlisted new code loud
/// instead of silent: adding one to <see cref="LedgerErrors"/> without deciding whether it belongs here fails
/// this test, rather than leaving <c>KnownCodes</c> quietly out of date.
/// </summary>
public class LedgerErrorResponseOptionsTests
{
    [Fact]
    public void KnownCodes_IsEveryLedgerErrorsCodeExceptIdempotencyKeyConflict()
    {
        var everyCode = typeof(LedgerErrors)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(f => f.IsLiteral && f.FieldType == typeof(string))
            .Select(f => (string)f.GetRawConstantValue()!)
            .Where(c => c != LedgerErrors.CodeKey && c != LedgerErrors.ReplayedKey)
            .Except([LedgerErrors.IdempotencyKeyConflict]);

        LedgerErrorResponseOptions.KnownCodes.ShouldBe(everyCode, ignoreOrder: true);
    }
}

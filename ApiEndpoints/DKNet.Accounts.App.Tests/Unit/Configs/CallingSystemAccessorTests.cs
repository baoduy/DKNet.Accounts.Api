using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using DKNet.Accounts.Api.Configs.Handlers;
using DKNet.Accounts.AppServices.Share;
using Moq;

namespace DKNet.Accounts.App.Tests.Unit.Configs;

/// <summary>
/// Unit-level coverage of <see cref="CallingSystemAccessor"/> for DRK-1670 §7 @unit — pins R2 (a machine
/// credential's <c>client_id</c> claim outranks a person's Entra <c>azp</c>/<c>appid</c> claims) and R1 (the
/// calling system names the application, never the individual, so two operators of one console share one
/// value while the acting person — resolved by <see cref="PrincipalProvider"/>, unchanged by this cycle —
/// differs). Exercised directly against a fake <see cref="IHttpContextAccessor"/>, the same approach
/// <c>PrincipalProviderTests</c> already uses.
/// </summary>
public sealed class CallingSystemAccessorTests
{
    #region Methods

    [Fact]
    public void CallingSystem_ShouldPreferClientId_OverAzpAndAppId()
    {
        var accessor = CreateAccessor(
            new Claim("client_id", "PayHub"),
            new Claim("azp", "ConsoleApp"),
            new Claim("appid", "LegacyConsoleApp"));

        accessor.CallingSystem.ShouldBe("PayHub");
    }

    [Fact]
    public void CallingSystem_ShouldBeTheSame_ForTwoOperatorsOfOneConsole_WhileTheActingPersonDiffers()
    {
        var operatorAContext = AuthenticatedContext(
            new Claim("azp", "ConsoleApp"), new Claim(ClaimTypes.NameIdentifier, "operator-a"));
        var operatorBContext = AuthenticatedContext(
            new Claim("azp", "ConsoleApp"), new Claim(ClaimTypes.NameIdentifier, "operator-b"));

        var callingSystemA = CreateAccessorFor(operatorAContext).CallingSystem;
        var callingSystemB = CreateAccessorFor(operatorBContext).CallingSystem;
        var personA = CreatePrincipalProviderFor(operatorAContext).GetCurrentUser();
        var personB = CreatePrincipalProviderFor(operatorBContext).GetCurrentUser();

        callingSystemA.ShouldBe("ConsoleApp");
        callingSystemB.ShouldBe("ConsoleApp");
        callingSystemA.ShouldBe(callingSystemB);
        personA.ShouldBe("operator-a");
        personB.ShouldBe("operator-b");
        personA.ShouldNotBe(personB);
    }

    private static ICallingSystemAccessor CreateAccessor(params Claim[] claims) =>
        CreateAccessorFor(AuthenticatedContext(claims));

    private static ICallingSystemAccessor CreateAccessorFor(HttpContext context)
    {
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(context);
        return new CallingSystemAccessor(accessor.Object);
    }

    private static IPrincipalProvider CreatePrincipalProviderFor(HttpContext context)
    {
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(context);
        return new PrincipalProvider(accessor.Object);
    }

    private static DefaultHttpContext AuthenticatedContext(params Claim[] claims) =>
        new() { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) };

    #endregion
}

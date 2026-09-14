using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using DKNet.Accounts.Api.Configs.Handlers;
using Moq;

namespace DKNet.Accounts.App.Tests.Unit.Configs;

/// <summary>
/// Unit-level coverage of <see cref="HttpContextSensitiveDataPrincipalAccessor"/> — the seam
/// <c>UseRoleAwareSensitiveData</c> reads on every serialization. Integration coverage exercising it
/// inside an active request (and so never reaching the no-request branch this class proves directly)
/// belongs alongside whatever feature next uses role-aware sensitive-data serialization.
/// </summary>
public sealed class HttpContextSensitiveDataPrincipalAccessorTests
{
    [Fact]
    public void Current_ShouldReturnTheHttpContextsUser_WhenARequestIsActive()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "caller")], "Test"));
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(new DefaultHttpContext { User = principal });

        var sut = new HttpContextSensitiveDataPrincipalAccessor(accessor.Object);

        sut.Current.ShouldBeSameAs(principal);
    }

    [Fact]
    public void Current_ShouldReturnNull_WhenNoHttpContextIsAvailable()
    {
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns((HttpContext?)null);

        var sut = new HttpContextSensitiveDataPrincipalAccessor(accessor.Object);

        sut.Current.ShouldBeNull();
    }
}

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.Infra.Contexts;

namespace DKNet.Accounts.App.Tests.Integration.GlobalExceptions;

/// <summary>
/// Drives <see cref="LedgerErrorResponseOptions.UnhandledError"/>'s per-exception cases through DKNet 11.0.0's
/// own <c>AddErrorResponses</c> registration (DRK-1522 §3 rows 7-8 replaced the second <c>IExceptionHandler</c>
/// this used to exercise, <c>GlobalExceptionHandler</c>/<c>GlobalExceptionConfigs</c>) on a
/// <see cref="WebApplication"/> + <see cref="TestServer"/> host, so assertions are made on the actual HTTP
/// response body rather than the handler's internals. The new body carries no <c>detail</c> member — the
/// message lives inside <c>errors[0].message</c> instead. Registers <c>AddErrorResponses</c> directly rather
/// than the full <c>AddFluentValidationConfig</c> (which also scans every validator in the AppServices
/// assembly for auto-validation — those validators need repository/DbContext dependencies this minimal host
/// never wires) — this class only exercises unhandled-exception shaping, not FluentValidation wiring.
/// </summary>
/// <remarks>
/// Every scenario here runs as "Staging", not "Development" — reproduced directly: ASP.NET Core's own
/// <c>WebApplicationBuilder</c> auto-adds <c>UseDeveloperExceptionPage()</c> ahead of anything an
/// <see cref="Microsoft.AspNetCore.Hosting.IStartupFilter"/> contributes (which is how <c>AddErrorResponses</c>
/// wires <c>UseExceptionHandler()</c>) whenever <see cref="IHostEnvironment.IsDevelopment"/> is true, and that
/// page itself writes to the same registered <see cref="Microsoft.AspNetCore.Http.IProblemDetailsService"/>
/// with its OWN body shape (exception type as <c>title</c>, message as <c>detail</c>) before
/// <see cref="LedgerErrorResponseOptions.UnhandledError"/> ever runs — a real interaction any host of this
/// service will hit under <c>ASPNETCORE_ENVIRONMENT=Development</c>, not a test artifact. The
/// Development-specific message-disclosure branch itself is covered without HTTP, directly against
/// <see cref="LedgerErrorResponseOptions.UnhandledError"/>, in <c>LedgerErrorResponseOptionsTests</c>.
///
/// Unhandled-exception logging is no longer covered here either: <c>ErrorResponseExceptionHandler</c> (DKNet
/// 11.0.0's own <see cref="IExceptionHandler"/>) reports itself as having handled the exception, which
/// suppresses ASP.NET Core's own <c>ExceptionHandlerMiddleware</c> diagnostic log for it — and this cycle
/// intentionally registers no second <see cref="IExceptionHandler"/> to log from instead (that is exactly the
/// hand-written conversion DRK-1522 removes; <c>NoHandWrittenFailureConversionTests</c> enforces it staying
/// gone). An unhandled exception this service converts to a response is therefore no longer logged
/// server-side by anything in this codebase — flagged to dev-leader as a monitoring gap worth its own
/// follow-up, not silently patched back in with another hand-written handler.
/// </remarks>
public sealed class GlobalExceptionHandlerHttpTests
{
    private const string GenericMessage = "An unexpected error occurred. Quote the trace-id when reporting this.";

    [Fact]
    public async Task UnexpectedError_ReturnsGenericMessageWithNoTypeAndNoInnerExceptionText()
    {
        var inner = new Exception(
            "23505: duplicate key value violates unique constraint \"IX_Products_Name\": Key (Name)=(Widget) already exists.");
        var outer = new InvalidOperationException("Saving changes failed.", inner);

        var result = await ThrowInHostAsync(outer);

        result.StatusCode.ShouldBe(HttpStatusCode.InternalServerError);
        result.Body.GetProperty("errors")[0].GetProperty("message").GetString().ShouldBe(GenericMessage);
        result.Body.TryGetProperty("type", out _).ShouldBeFalse();
        result.Body.TryGetProperty("detail", out _).ShouldBeFalse();

        var raw = result.Body.ToString();
        raw.ShouldNotContain("23505");
        raw.ShouldNotContain("IX_Products_Name");
        raw.ShouldNotContain("Widget");
    }

    [Fact]
    public async Task UnexpectedError_StillExposesTraceId()
    {
        var result = await ThrowInHostAsync(new Exception("boom"));

        result.Body.TryGetProperty("traceId", out var traceId).ShouldBeTrue();
        traceId.GetString().ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task ExceptionMessageContainingBraces_DoesNotBreakTheResponse()
    {
        var exception = new InvalidOperationException("Unexpected token { at position } 12");

        var result = await ThrowInHostAsync(exception);

        result.StatusCode.ShouldBe(HttpStatusCode.InternalServerError);
        result.Body.GetProperty("errors")[0].GetProperty("message").GetString().ShouldBe(GenericMessage);
    }

    [Fact]
    public async Task OwnershipRequiredException_Returns403WithoutLeakingEfDetail()
    {
        var result = await ThrowInHostAsync(new OwnershipRequiredException());

        result.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        result.Body.TryGetProperty("type", out _).ShouldBeFalse();
        result.Body.TryGetProperty("detail", out _).ShouldBeFalse();
    }

    [Fact]
    public async Task DbUpdateException_ForAUniqueConstraintViolation_Returns409()
    {
        var inner = new Exception("duplicate key value violates unique constraint \"IX_Accounts_AccountNumber\"");
        var outer = new DbUpdateException("Saving changes failed.", inner);

        var result = await ThrowInHostAsync(outer);

        result.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        result.Body.GetProperty("errors")[0].GetProperty("message").GetString()
            .ShouldBe("The request conflicts with an existing record.");
    }

    [Fact]
    public async Task DbUpdateException_ForAnUnrelatedFailure_Returns500()
    {
        // Same exception type as the 409 case above, but the inner message names neither "unique" nor
        // "duplicate" — this is the branch's guard condition, not just its type match.
        var inner = new Exception("could not connect to server");
        var outer = new DbUpdateException("Saving changes failed.", inner);

        var result = await ThrowInHostAsync(outer);

        result.StatusCode.ShouldBe(HttpStatusCode.InternalServerError);
    }

    private static async Task<ThrowResult> ThrowInHostAsync(Exception exceptionToThrow)
    {
        await using var app = BuildHost();
        app.MapGet("/throw", (Func<IResult>)(() => throw exceptionToThrow));
        await app.StartAsync();

        using var client = app.GetTestClient();
        var response = await client.GetAsync("/throw");
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

        return new ThrowResult(response.StatusCode, body);
    }

    private static WebApplication BuildHost()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Staging" });
        builder.WebHost.UseTestServer();
        builder.Services.AddRouting();

        var httpContextAccessor = new HttpContextAccessor();
        builder.Services.AddErrorResponses(options =>
        {
            options.StatusCode = LedgerErrorResponseOptions.StatusCode;
            options.UnhandledError = context =>
                LedgerErrorResponseOptions.UnhandledError(context, isDevelopment: false, httpContextAccessor);
        });

        var app = builder.Build();
        app.UseRouting();
        return app;
    }

    private sealed record ThrowResult(HttpStatusCode StatusCode, JsonElement Body);
}

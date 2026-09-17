using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using DKNet.Accounts.Api.Configs;

namespace DKNet.Accounts.App.Tests.Integration.GlobalExceptions;

/// <summary>
/// DRK-1522 §5, "An unhandled error answers through the same setting and discloses nothing". Drives the
/// service's one real registration entry point, <see cref="FluentValidationConfig.AddFluentValidationConfig"/>
/// (§3 row 6/8: unchanged before and after this cycle — only what <c>LedgerErrorResponseOptions</c> itself
/// does changes) rather than <c>GlobalExceptionHandler</c>/<c>GlobalExceptionConfigs</c> directly, so this
/// test still compiles and still asks the right question once §3 row 7 removes them: today, calling only
/// <c>AddFluentValidationConfig()</c> wires no exception handler at all (an unhandled throw propagates out of
/// the test host unhandled) — red for a nameable reason. After Build, DKNet 11.0.0's <c>AddErrorResponses</c>
/// auto-registers <c>ErrorResponseExceptionHandler</c> and its own <c>UseExceptionHandler()</c> startup
/// filter, so the same call alone is enough to shape the response through
/// <c>LedgerErrorResponseOptions.UnhandledError</c>.
/// </summary>
public sealed class UnhandledErrorResponseShapeTests
{
    [Fact]
    public async Task AnUnexpectedError_AnswersWithTheSameShapeAsARefusalAndDisclosesNothing()
    {
        var builder = WebApplication.CreateBuilder(
            new WebApplicationOptions { EnvironmentName = "Production" });
        builder.WebHost.UseTestServer();
        builder.Services.AddRouting();
        builder.AddFluentValidationConfig();

        await using var app = builder.Build();
        app.UseRouting();
        app.MapGet("/throw", (Func<IResult>)(() =>
            throw new InvalidOperationException("secret internal detail that must never reach a caller")));
        await app.StartAsync();

        using var client = app.GetTestClient();
        var response = await client.GetAsync("/throw");

        response.StatusCode.ShouldBe(HttpStatusCode.InternalServerError);
        var raw = await response.Content.ReadAsStringAsync();
        var body = JsonDocument.Parse(raw).RootElement;

        body.TryGetProperty("detail", out _).ShouldBeFalse("an unhandled-error body must carry no 'detail' member.");
        body.TryGetProperty("errors", out var errors).ShouldBeTrue(
            $"expected the same {{errors:[...]}} shape a refusal response carries, got: {raw}");
        errors.EnumerateArray().ShouldAllBe(e => !string.IsNullOrWhiteSpace(e.GetProperty("message").GetString()));
        raw.ShouldNotContain("secret internal detail");
        raw.ShouldNotContain(nameof(InvalidOperationException));
    }
}

using System.Collections.Concurrent;
using System.Net.Http.Json;
using FluentResults;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Logging;
using SharpGrip.FluentValidation.AutoValidation.Endpoints.Extensions;
using DKNet.AspCore.Extensions.Responses;
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
///
/// DRK-1535 §3b adds the two scenarios below: an unhandled error must leave one error-severity server-side
/// record under the same trace id the response carries, and a refusal (command or input) must leave none.
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

    /// <summary>
    /// DRK-1535 §3b: "An unhandled error is recorded on the server under the trace id the caller was given".
    /// The trace id is read off the response body, never recomputed — the point of the scenario is that the
    /// server-side record and the caller-visible trace id agree.
    /// </summary>
    [Fact]
    public async Task AnUnhandledError_IsRecordedOnTheServerUnderTheSameTraceIdTheCallerWasGiven()
    {
        var sink = new FakeLoggerSink();
        var builder = WebApplication.CreateBuilder(
            new WebApplicationOptions { EnvironmentName = "Production" });
        builder.WebHost.UseTestServer();
        builder.Services.AddRouting();
        builder.Logging.ClearProviders().AddProvider(sink);
        builder.AddFluentValidationConfig();

        await using var app = builder.Build();
        app.UseRouting();
        app.MapGet("/throw", (Func<IResult>)(() =>
            throw new InvalidOperationException("secret internal detail that must never reach a caller")));
        await app.StartAsync();

        using var client = app.GetTestClient();
        var response = await client.GetAsync("/throw");

        var raw = await response.Content.ReadAsStringAsync();
        var traceId = JsonDocument.Parse(raw).RootElement.GetProperty("traceId").GetString();
        traceId.ShouldNotBeNullOrEmpty();

        var errorEntries = sink.EntriesAt(LogLevel.Error);
        errorEntries.Count.ShouldBe(1);
        errorEntries[0].Message.ShouldContain(traceId!);
        errorEntries[0].Exception.ShouldBeOfType<InvalidOperationException>();
    }

    /// <summary>
    /// DRK-1535 §3b negative: a refused command and a refused input are not unhandled errors. This holds
    /// structurally — <see cref="DKNet.Accounts.Api.Configs.GlobalExceptions.LedgerErrorResponseOptions.UnhandledError"/>
    /// is wired to <c>ErrorResponseOptions.UnhandledError</c> alone, invoked only for
    /// <see cref="ErrorSource.Unhandled"/> — so a command failure (<see cref="ErrorSource.Command"/>) and a
    /// validation refusal (<see cref="ErrorSource.Validation"/>) never reach it. Proved end to end rather than
    /// asserted from the wiring alone.
    /// </summary>
    [Fact]
    public async Task ARefusedCommandAndARefusedInput_LeaveNoErrorSeverityRecord()
    {
        var sink = new FakeLoggerSink();
        var builder = WebApplication.CreateBuilder(
            new WebApplicationOptions { EnvironmentName = "Production" });
        builder.WebHost.UseTestServer();
        builder.Services.AddRouting();
        builder.Services.AddScoped<IValidator<ProbeRequest>, ProbeRequestValidator>();
        builder.Logging.ClearProviders().AddProvider(sink);
        builder.AddFluentValidationConfig();

        await using var app = builder.Build();
        app.UseRouting();
        app.MapGet("/refuse-command", () => Result.Fail("This command was refused.").Response());
        app.MapPost("/refuse-input", (ProbeRequest req) => Results.Ok()).AddFluentValidationAutoValidation();
        await app.StartAsync();

        using var client = app.GetTestClient();
        var commandResponse = await client.GetAsync("/refuse-command");
        var inputResponse = await client.PostAsJsonAsync("/refuse-input", new ProbeRequest(null));

        commandResponse.StatusCode.ShouldNotBe(HttpStatusCode.InternalServerError);
        inputResponse.StatusCode.ShouldNotBe(HttpStatusCode.InternalServerError);
        sink.EntriesAt(LogLevel.Error).ShouldBeEmpty();
    }

    private sealed record ProbeRequest(string? Name);

    private sealed class ProbeRequestValidator : AbstractValidator<ProbeRequest>
    {
        public ProbeRequestValidator() => RuleFor(r => r.Name).NotEmpty();
    }

    private sealed record LogEntry(LogLevel Level, string Message, Exception? Exception);

    /// <summary>
    /// Hand-written <see cref="ILoggerProvider"/>/<see cref="ILogger"/> fake — the cheapest test double that
    /// captures every log entry written through it, regardless of category, since
    /// <c>LedgerErrorResponseOptions</c> logs under its own type name rather than a name this test would have
    /// to hardcode.
    /// </summary>
    private sealed class FakeLoggerSink : ILoggerProvider
    {
        private readonly ConcurrentQueue<LogEntry> _entries = new();

        public IReadOnlyList<LogEntry> EntriesAt(LogLevel level) =>
            _entries.Where(e => e.Level == level).ToList();

        public ILogger CreateLogger(string categoryName) => new FakeLogger(_entries);

        public void Dispose()
        {
        }

        private sealed class FakeLogger(ConcurrentQueue<LogEntry> entries) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel, EventId eventId, TState state, Exception? exception,
                Func<TState, Exception?, string> formatter) =>
                entries.Enqueue(new LogEntry(logLevel, formatter(state, exception), exception));
        }
    }
}

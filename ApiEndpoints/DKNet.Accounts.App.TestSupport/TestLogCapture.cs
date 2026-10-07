using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace DKNet.Accounts.App.TestSupport;

/// <summary>
/// Captures log lines written through <see cref="ILogger"/> during a scenario, so a step can assert on
/// observable log output instead of on internal call order. Registered as an additional <see cref="ILoggerProvider"/>
/// in a test host — it does not replace the console/other providers already configured.
/// </summary>
public sealed class TestLogCapture : ILoggerProvider
{
    private readonly ConcurrentQueue<Entry> _entries = new();

    /// <summary>One captured log line and the level it was written at.</summary>
    public sealed record Entry(LogLevel Level, string Message);

    public IReadOnlyCollection<string> Messages => _entries.Select(e => e.Message).ToArray();

    /// <summary>Every captured line with its level, in the order written.</summary>
    public IReadOnlyCollection<Entry> Entries => _entries.ToArray();

    public void Clear() => _entries.Clear();

    public ILogger CreateLogger(string categoryName) => new CapturingLogger(_entries);

    public void Dispose()
    {
    }

    private sealed class CapturingLogger(ConcurrentQueue<Entry> sink) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter) =>
            sink.Enqueue(new Entry(logLevel, formatter(state, exception)));
    }
}

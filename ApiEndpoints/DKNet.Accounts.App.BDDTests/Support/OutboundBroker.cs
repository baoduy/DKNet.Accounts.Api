using System.Net;
using System.Net.Sockets;
using Testcontainers.RabbitMq;

namespace DKNet.Accounts.App.BDDTests.Support;

/// <summary>
/// The run-shared RabbitMQ broker the outbound-events scenarios (DRK-1773 §5) publish to. Started on first use,
/// so a run that selects none of them never pulls the image; stopped with the run in
/// <see cref="ApiHooks.AfterTestRun"/>. Its AMQP port is bound to one fixed host port for the whole run, so a
/// scenario can stop the broker ("the message bus is unreachable") and start it again without the service's
/// configured connection string going stale.
/// </summary>
public static class OutboundBroker
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static RabbitMqContainer? _container;
    private static bool _running;

    /// <summary>The broker's AMQP connection string. Only valid after <see cref="EnsureRunningAsync"/>.</summary>
    public static string ConnectionString { get; private set; } = "";

    /// <summary>Starts the broker if it is not running — the first call creates it.</summary>
    public static async Task EnsureRunningAsync()
    {
        await Gate.WaitAsync();
        try
        {
            if (_container is null)
            {
                _container = new RabbitMqBuilder("rabbitmq:4-alpine")
                    .WithPortBinding(FreeTcpPort(), RabbitMqBuilder.RabbitMqPort)
                    .Build();
            }

            if (!_running)
            {
                await _container.StartAsync();
                _running = true;
                ConnectionString = _container.GetConnectionString();
            }
        }
        finally
        {
            Gate.Release();
        }
    }

    /// <summary>Stops the broker, keeping the container, so <see cref="EnsureRunningAsync"/> can bring it back on
    /// the same port.</summary>
    public static async Task StopAsync()
    {
        await Gate.WaitAsync();
        try
        {
            if (_container is not null && _running)
            {
                await _container.StopAsync();
                _running = false;
            }
        }
        finally
        {
            Gate.Release();
        }
    }

    /// <summary>Removes the broker at the end of the run. A run that never used it has nothing to remove.</summary>
    public static async Task DisposeAsync()
    {
        if (_container is not null)
        {
            await _container.DisposeAsync();
            _container = null;
            _running = false;
        }
    }

    private static int FreeTcpPort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        return ((IPEndPoint)listener.LocalEndpoint).Port;
    }
}

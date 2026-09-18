using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using DKNet.Accounts.App.TestSupport;
using DKNet.Accounts.Client;
using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>
/// DRK-1638 §5 — <c>AddAccountClient</c> registration and the client's own credential/log hygiene (R3).
/// Every scenario here is <c>@unit</c>: the network is stood in for by <see cref="RecordingHandler"/>, never
/// a real socket.
/// </summary>
public sealed class RegistrationAndCredentialTests
{
    private static readonly Uri ServiceAddress = new("https://accounts.example.test");

    /// <summary>"The supplied message handler runs on every request."</summary>
    [Fact]
    public async Task TheSuppliedMessageHandlerRunsOnEveryRequest()
    {
        var handler = new RecordingHandler { ResponseBody = "{\"items\":[],\"pageCount\":0,\"pageNumber\":1,\"pageSize\":1000,\"totalItemCount\":0,\"hasNextPage\":false,\"hasPreviousPage\":false}" };
        var services = new ServiceCollection();
        services.AddSingleton(handler);
        services.AddAccountClient(ServiceAddress, typeof(RecordingHandler));

        using var provider = services.BuildServiceProvider();
        var client = provider.GetRequiredService<IAccountClient>();

        await client.GetCurrenciesAsync();

        handler.LastRequest.ShouldNotBeNull("the supplied handler must see the request before it leaves the application");
    }

    /// <summary>"An application that needs no message handler still registers." No real socket: the
    /// primary transport is overridden the same way <see cref="TheClientAttachesNoCredentialOfItsOwn"/>
    /// does, without adding a message handler of its own — the thing under test (registration resolves
    /// <see cref="IAccountClient"/> and its call reaches the wire) stays intact.</summary>
    [Fact]
    public async Task AnApplicationThatNeedsNoMessageHandlerStillRegisters()
    {
        var handler = new RecordingHandler { ResponseBody = "{\"items\":[],\"pageCount\":0,\"pageNumber\":1,\"pageSize\":1000,\"totalItemCount\":0,\"hasNextPage\":false,\"hasPreviousPage\":false}" };
        var services = new ServiceCollection();
        services.AddAccountClient(ServiceAddress);
        services.AddHttpClient<IAccountClient, AccountClient>().ConfigurePrimaryHttpMessageHandler(() => handler);

        using var provider = services.BuildServiceProvider();
        var client = provider.GetRequiredService<IAccountClient>();

        var currencies = await client.GetCurrenciesAsync();

        currencies.ShouldNotBeNull();
    }

    /// <summary>"The client attaches no credential of its own."</summary>
    [Fact]
    public async Task TheClientAttachesNoCredentialOfItsOwn()
    {
        var handler = new RecordingHandler { ResponseBody = "{\"items\":[],\"pageCount\":0,\"pageNumber\":1,\"pageSize\":1000,\"totalItemCount\":0,\"hasNextPage\":false,\"hasPreviousPage\":false}" };
        var services = new ServiceCollection();
        services.AddAccountClient(ServiceAddress);
        // No message handler was requested — this overrides only the primary transport so the test never
        // hits a real socket, without adding a message handler of its own (the thing under test is absence).
        services.AddHttpClient<IAccountClient, AccountClient>().ConfigurePrimaryHttpMessageHandler(() => handler);

        using var provider = services.BuildServiceProvider();
        var client = provider.GetRequiredService<IAccountClient>();

        await client.GetCurrenciesAsync();

        handler.LastRequest.ShouldNotBeNull();
        handler.LastRequest!.Headers.Authorization.ShouldBeNull();
    }

    /// <summary>"The client writes no credential to a log." <see cref="AttachTokenHandler"/> is the plain
    /// shape every auth sample uses — no inner handler wired in its constructor — registered as a chained
    /// handler via <see cref="ServiceCollectionExtensions.AddAccountClient(IServiceCollection, Uri, Type)"/>
    /// (spec §3 row 8: chained via <c>AddHttpMessageHandler</c>); <see cref="RecordingHandler"/> stands in as
    /// the primary transport underneath it, registered before <c>AddAccountClient</c> so it is not the
    /// registration <c>AddAccountClient</c> itself still (pre-fix) assigns as primary.</summary>
    [Fact]
    public async Task TheClientWritesNoCredentialToALog()
    {
        const string token = "super-secret-token-value";
        var handler = new RecordingHandler { ResponseBody = "{\"items\":[],\"pageCount\":0,\"pageNumber\":1,\"pageSize\":1000,\"totalItemCount\":0,\"hasNextPage\":false,\"hasPreviousPage\":false}" };
        var logCapture = new TestLogCapture();

        var services = new ServiceCollection();
        services.AddLogging(b => b.AddProvider(logCapture));
        services.AddHttpClient<IAccountClient, AccountClient>().ConfigurePrimaryHttpMessageHandler(() => handler);
        services.AddSingleton(_ => new AttachTokenHandler(token));
        services.AddAccountClient(ServiceAddress, typeof(AttachTokenHandler));

        using var provider = services.BuildServiceProvider();
        var client = provider.GetRequiredService<IAccountClient>();

        await client.GetCurrenciesAsync();

        logCapture.Messages.ShouldAllBe(m => !m.Contains(token, StringComparison.Ordinal));
    }

    /// <summary>The application's own message handler — attaches a credential the way a real consumer would,
    /// so <see cref="TheClientWritesNoCredentialToALog"/> can prove that credential never reaches a log line
    /// the client itself writes. Takes no inner handler: a handler meant to be chained via
    /// <c>AddHttpMessageHandler</c> must leave <see cref="DelegatingHandler.InnerHandler"/> null for the
    /// framework to assign — the shape every real auth handler uses.</summary>
    private sealed class AttachTokenHandler(string token) : DelegatingHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            return base.SendAsync(request, cancellationToken);
        }
    }
}

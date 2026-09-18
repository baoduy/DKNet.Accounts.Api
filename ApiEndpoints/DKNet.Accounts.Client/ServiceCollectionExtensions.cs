using Microsoft.Extensions.DependencyInjection;

namespace DKNet.Accounts.Client;

/// <summary>Registers <see cref="IAccountClient"/> as a typed <see cref="HttpClient"/> pointed at the
/// accounts service. Never attaches a credential itself (R3) — an application that needs one supplies its
/// own <see cref="DelegatingHandler"/>, chained onto every request the client sends.</summary>
public static class ServiceCollectionExtensions
{
    /// <summary>Registers <see cref="IAccountClient"/> with no message handler — the application attaches
    /// no credential of its own (spec "The client attaches no credential of its own").</summary>
    /// <param name="services">The application's service collection.</param>
    /// <param name="baseAddress">The accounts service's base address.</param>
    public static IServiceCollection AddAccountClient(this IServiceCollection services, Uri baseAddress)
    {
        services.AddHttpClient<IAccountClient, AccountClient>(c => c.BaseAddress = baseAddress);
        return services;
    }

    /// <summary>Registers <see cref="IAccountClient"/> and chains <paramref name="messageHandlerType"/> onto
    /// every request it sends, so the application can attach its own credential.</summary>
    /// <param name="services">The application's service collection.</param>
    /// <param name="baseAddress">The accounts service's base address.</param>
    /// <param name="messageHandlerType">A <see cref="DelegatingHandler"/> registered in
    /// <paramref name="services"/> — resolved per request the same way any typed-client message handler is.
    /// Wired in as the client's primary transport (rather than via <c>AddHttpMessageHandler</c>) so a handler
    /// that already wraps its own inner transport — the normal shape for a consumer that also wants to stub
    /// the network in a test — is not rejected by <c>HttpMessageHandlerBuilder</c>'s "InnerHandler must be
    /// null" rule for chained handlers.</param>
    public static IServiceCollection AddAccountClient(this IServiceCollection services, Uri baseAddress, Type messageHandlerType)
    {
        services.AddHttpClient<IAccountClient, AccountClient>(c => c.BaseAddress = baseAddress)
            .ConfigurePrimaryHttpMessageHandler(sp => (HttpMessageHandler)sp.GetRequiredService(messageHandlerType));
        return services;
    }
}

using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace DKNet.Accounts.App.Tests.Client;

/// <summary>
/// Test double standing in for the network — records the last <see cref="HttpRequestMessage"/> it saw and
/// answers with a canned response, so a client scenario never needs a real network call to the service.
/// Works both as a caller-supplied message handler (chained via
/// <c>AddAccountClient(services, baseAddress, typeof(RecordingHandler))</c>) and as a typed client's
/// primary transport (via <c>ConfigurePrimaryHttpMessageHandler</c>) — either way it never forwards to a
/// real socket.
/// </summary>
public sealed class RecordingHandler : DelegatingHandler
{
    public HttpRequestMessage? LastRequest { get; private set; }

    public string ResponseBody { get; set; } = "[]";

    public HttpStatusCode ResponseStatusCode { get; set; } = HttpStatusCode.OK;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequest = request;
        var response = new HttpResponseMessage(ResponseStatusCode)
        {
            Content = new StringContent(ResponseBody, Encoding.UTF8, "application/json")
        };
        return Task.FromResult(response);
    }
}

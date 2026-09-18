# DKNet.Accounts.Client

A typed .NET client for the DKNet Accounts service — one method per live route, no bookkeeping of
routes or JSON in your own code.

## ✨ Why use it?

- **One interface, every route.** `IAccountClient` exposes account groups, accounts, currencies and
  postings as typed async methods — no hand-built `HttpRequestMessage`, no route strings to keep in
  sync with the service.
- **You attach your own credential.** The client never obtains, stores or logs one — it only sends
  whatever `DelegatingHandler` your application registers.
- **A refusal is data, not JSON you parse yourself.** A non-success response throws
  `AccountApiException` with the status code and a typed `Errors` list already picked apart.

## 🚀 Quick Start

The package lives in GitHub Packages of `baoduy/DKNet.Accounts.Api`, not NuGet.org, and that feed has
no anonymous read — you need a GitHub personal access token with `read:packages` scope to restore it.

Add the feed once, sourcing the token from an environment variable so it never lands in a file you
commit:

```bash
dotnet nuget add source https://nuget.pkg.github.com/baoduy/index.json \
  --name github-baoduy \
  --username YOUR_GITHUB_USERNAME \
  --password $GH_PACKAGES_TOKEN \
  --store-password-in-clear-text
```

`--store-password-in-clear-text` writes the command above into your **user-level** `nuget.config`
(outside the repo) so the token still never reaches a committed file. On CI, set the same command's
`--password` from a secret instead of a literal.

Install:

```bash
dotnet add package DKNet.Accounts.Client
```

Register it with no credential of its own — an application that needs none still works:

```csharp
services.AddAccountClient(new Uri("https://accounts.example.com"));
```

Or chain your own `DelegatingHandler` onto every request, so the application attaches the credential:

```csharp
services.AddSingleton<BearerTokenHandler>();
services.AddAccountClient(new Uri("https://accounts.example.com"), typeof(BearerTokenHandler));
```

Call it:

```csharp
var client = provider.GetRequiredService<IAccountClient>();
var currencies = await client.GetCurrenciesAsync();
```

A refusal comes back as an exception, not a JSON body to parse:

```csharp
try
{
    await client.RecordPostingAsync(request, idempotencyKey: "pay-77af");
}
catch (AccountApiException ex)
{
    // ex.StatusCode, ex.Errors[0].Code / .Field / .Message
}
```

Full route coverage, list-query arguments and the idempotency contract:
[docs/accounts-client.md](../../docs/accounts-client.md).

using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Share.Generics;
using DKNet.Accounts.Domains.Share;

// ReSharper disable once CheckNamespace
namespace Microsoft.AspNetCore.Builder;

/// <summary>
///     Template-local endpoint mapper for status-count aggregation. Not part of the published
///     <c>DKNet.AspCore.Extensions</c> package — <see cref="DKNet.Accounts.AppServices.Share.Generics" /> stays template-local
///     (see DRK-500 §4).
/// </summary>
[ExcludeFromCodeCoverage]
internal static class StatusCountsEndpointMapperExtensions
{
    extension(RouteGroupBuilder app)
    {
        /// <summary>
        ///     Gets status counts endpoint.
        /// </summary>
        /// <param name="properties"></param>
        /// <param name="endpoint"></param>
        /// <typeparam name="TEntity"></typeparam>
        /// <returns></returns>
        public RouteHandlerBuilder MapGetStatusCounts<TEntity>(string endpoint = "status",
            params StatusPropertyInfo[] properties) where TEntity : DomainEntity
        {
            return app.MapGet(endpoint,
                    async (HttpRequest request,
                        [AsParameters] GenericStatusCountsParameters parameters,
                        [FromServices] IRepositorySpec repo) =>
                    {
                        // R2: this route's only narrowing is the created-on window (from/to) — any other query
                        // key is refused with 400, never silently ignored the way [AsParameters] binding would
                        // otherwise leave it. Shaped as a plain `errors[]` array, this service's own business-
                        // refusal shape, never the ASP.NET model-binding failure's `errors` object.
                        var unknownKeys = request.Query.Keys
                            .Where(k => !string.Equals(k, "from", StringComparison.OrdinalIgnoreCase) &&
                                        !string.Equals(k, "to", StringComparison.OrdinalIgnoreCase))
                            .ToArray();
                        if (unknownKeys.Length > 0)
                        {
                            return Results.Json(
                                new
                                {
                                    errors = new[]
                                    {
                                        new
                                        {
                                            code = "UnsupportedNarrowing",
                                            message =
                                                $"Unsupported query parameter(s): {string.Join(", ", unknownKeys)}. " +
                                                "Only 'from' and 'to' are accepted."
                                        }
                                    }
                                },
                                statusCode: StatusCodes.Status400BadRequest);
                        }

                        var results = new List<StatusCountsResult>();
                        foreach (var property in properties)
                        {
                            var counts = await repo.GetStatusCounts<TEntity>(property, parameters).ConfigureAwait(false);
                            results.AddRange(counts);
                        }
                        return Results.Ok(results);
                    })
                .CacheOutput()
                .ProducesCommons()
                .Produces<List<StatusCountsResult>>()
                .Produces(StatusCodes.Status400BadRequest)
                .WithDescription(
                    $"Retrieve grouped counts of '{string.Join(',', properties.Select(p => p.Name))}' for {typeof(TEntity).Name} within date range.");
        }
    }
}

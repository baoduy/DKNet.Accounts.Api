using FluentValidation;
using DKNet.AspCore.Extensions.Responses;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.AppServices.Postings.V1.Actions;
using DKNet.Accounts.AppServices.Postings.V1.Queries;
using DKNet.Accounts.Domains.Features.Postings.Entities;

namespace DKNet.Accounts.Api.ApiEndpoints.Postings;

internal sealed class PostingsV1Endpoint : IEndpointConfig
{
    public int Version => 1;

    public string GroupEndpoint => "/postings";

    public void Map(RouteGroupBuilder group)
    {
        // Cross-account list (DRK-1659 §5 row "GET /v1/postings"): binds ten explicit primitives, not
        // [AsParameters] ListPostingsQuery — reproduced directly, [AsParameters] here answers every request
        // with an unlogged, bodyless 400 (the same minimal-API binding trap AccountsV1Endpoint's statement
        // route already documents at its own GET route, just triggered here with no sibling route parameter
        // at all). ListPostingsQueryValidator is instead run explicitly against the assembled query — the
        // group's AddFluentValidationAutoValidation() endpoint filter (Program.cs) only inspects bound
        // parameters, so it never sees a query value built inside the lambda body either way.
        group.MapGet("/", async (
                DateOnly? from,
                DateOnly? to,
                Guid? accountId,
                string? direction,
                string? category,
                string? status,
                string? search,
                string? orderBy,
                bool? desc,
                int? pageNumber,
                int? pageSize,
                IValidator<ListPostingsQuery> validator,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var query = new ListPostingsQuery
                {
                    From = from,
                    To = to,
                    AccountId = accountId,
                    Direction = direction,
                    Category = category,
                    Status = status,
                    Search = search,
                    OrderBy = orderBy,
                    Desc = desc ?? false,
                    PageNumber = pageNumber,
                    PageSize = pageSize
                };

                var validation = await validator.ValidateAsync(query, ct);
                if (!validation.IsValid)
                {
                    var errors = validation.Errors
                        .Select(e => new ErrorItem(
                            e.ErrorMessage, string.IsNullOrEmpty(e.ErrorCode) ? null : e.ErrorCode, e.PropertyName))
                        .ToArray();
                    var errorContext = new ErrorResponseContext { Source = ErrorSource.Validation, Errors = errors };
                    var problem = new ProblemDetails
                    {
                        Title = "Request refused.",
                        Status = LedgerErrorResponseOptions.StatusCode(errorContext) ?? StatusCodes.Status400BadRequest
                    };
                    problem.Extensions["errors"] = errors;
                    return Results.Problem(problem);
                }

                var page = await bus.Send(query, cancellationToken: ct);
                return Results.Ok(new PagedResponse<PostingDto>(page));
            })
            .RequireScope(group, ScopeNames.PostingsRead)
            .Produces<PagedResponse<PostingDto>>()
            .WithDescription(
                "List postings across every account, within a required effective-date window of at most " +
                "90 days. Narrow by account, direction, category or status; search and order over the same " +
                "fields the statement route projects.");

        group.MapPost("/", async (
                RecordPostingRequest req,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var result = await bus.Send(req, cancellationToken: ct);
                return result.Response(isCreated: !result.IsReplayed());
            })
            .RequireScope(group, ScopeNames.PostingsWrite)
            .Produces<PostingDto>(StatusCodes.Status201Created)
            .WithDescription(
                "Record one credit or debit. Idempotency key is required in the header: " +
                "Idempotency-Key: {IdempotencyKey}.");

        group.MapPost("batch", async (
                RecordPostingBatchRequest req,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var result = await bus.Send(req, cancellationToken: ct);
                return result.Response(isCreated: !result.IsReplayed());
            })
            .RequireScope(group, ScopeNames.PostingsWrite)
            .Produces<IReadOnlyCollection<PostingDto>>(StatusCodes.Status201Created)
            .WithDescription("Record several movements as one all-or-nothing batch.");

        // Get-by-id (GEN, DRK-1277 §3 row 11): plain generic entity mapper. The explicit "{id:guid}" endpoint
        // keeps the same route pattern this used before (the mapper's own default is the looser "{id}").
        group.MapGetById<Posting, Guid, PostingDto>("{id:guid}")
            .RequireScope(group, ScopeNames.PostingsRead)
            .WithDescription("Read one posting.");

        // Reverse (GEN-mapper, DRK-1277 §3 row 16): MapActionById, not MapParameterlessActionById — reverse
        // now carries a required `reason` in the body, which the parameterless variant never reads. This one
        // binds the body AND overwrites Id from the route, and ReversePostingCommandHandler still handles the
        // request. Status codes are unaffected: LedgerErrors->422/409 comes from the one AddErrorResponses
        // registration (LedgerErrorResponseOptions), which the package resolves when the response executes,
        // not from whichever mapper registered the route.
        // Still NOT a [CrudAction]: that marker binds a public entity method by name convention, so a rename,
        // a generator version bump or a namespace move could silently rebind this request onto the generated
        // handler instead of ReversePostingCommandHandler, turning every reversal into a call to a throwing stub.
        group.MapActionById<ReversePostingRequest, Guid, PostingDto>("{id:guid}/reverse", "POST")
            .RequireScope(group, ScopeNames.PostingsReverse)
            .Produces<PostingDto>()
            .WithDescription(
                "Reverse a posting. Requires a reason in the body and an idempotency key in the header: " +
                "Idempotency-Key: {IdempotencyKey}.");
    }
}

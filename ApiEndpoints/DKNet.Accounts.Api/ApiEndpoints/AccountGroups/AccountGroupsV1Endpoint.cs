using FluentValidation;
using DKNet.Accounts.Api.Configs.Auth;
using DKNet.Accounts.Api.Configs.GlobalExceptions;
using DKNet.Accounts.AppServices.AccountGroups.V1;
using DKNet.Accounts.AppServices.AccountGroups.V1.Actions;
using DKNet.Accounts.AppServices.AccountGroups.V1.Queries;
using DKNet.Accounts.AppServices.Crud;
using DKNet.Accounts.Domains.Features.AccountGroups.Entities;

namespace DKNet.Accounts.Api.ApiEndpoints.AccountGroups;

internal sealed class AccountGroupsV1Endpoint : IEndpointConfig
{
    public int Version => 1;

    public string GroupEndpoint => "/account-groups";

    public void Map(RouteGroupBuilder group)
    {
        // Create (GEN, DRK-1418 §3 row 8): CreateAccountGroupRequest is generated from AccountGroup's
        // [CrudCreate] constructor; the duplicate-code refusal now lives in
        // CreateAccountGroupCommandValidator (FluentValidation), so the route can use the package's own
        // MapPost — its failure path answers through LedgerErrorResponseOptions (AddErrorResponses,
        // FluentValidationConfig), which gives DUPLICATE_GROUP_CODE the same 422+code shape
        // LedgerResultResponseExtensions gives every hand-mapped route.
        group.MapPost<CreateAccountGroupRequest, AccountGroupDto>("/")
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription("Create an account group.");

        // List (GEN, DRK-1277 §11/§12): a list is not a mutation, but the owner's widened mandate takes the
        // generated list syntax/envelope wherever a caller can still ask everything the old shape let it ask
        // (R4) — plain generic entity mapper, no SlimBus handler, R3 doesn't apply.
        group.MapGetList<AccountGroup, Guid, AccountGroupDto>()
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("List account groups. Filter as 'field:operation:value', e.g. filter=Type:Equal:Customer.");

        // Get-by-id (GEN, DRK-1277 §3 row 9): plain generic entity mapper — no SlimBus handler or [CrudCreate]
        // /[CrudUpdate]/[CrudAction] involved, so none of the Map{Entity}Crud caveats above apply. The
        // explicit "{id:guid}" endpoint keeps the same route pattern this used before (the mapper's own
        // default is the looser "{id}").
        group.MapGetById<AccountGroup, Guid, AccountGroupDto>("{id:guid}")
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("Read one account group.");

        // Rename (GEN, DRK-1277 §11/§12): [CrudUpdate] on AccountGroup.Rename — the first such member on the
        // type, so the generator lands it on the plain "{id}" route. Generated request AND handler; only the
        // route registration is a direct call instead of going through Map{Entity}Crud (whose composite
        // discards the RouteHandlerBuilder it needs to chain .RequireScope onto) — MapPutById itself returns
        // a chainable builder, so no hand-written plumbing is added. Rename's only failure mode is 404
        // (NotFoundError, mapped by the default .Response()), so R3 does not block this one.
        group.MapPutById<RenameAccountGroupRequest, Guid, AccountGroupDto>("{id:guid}")
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription("Rename an account group.");

        // ChangeDescription/ChangeMetadata (GEN, DRK-1277 §11/§12): same reasoning as Rename — each additional
        // [CrudUpdate] member lands on "{id}/{kebab-case-method-name}".
        group.MapPutById<ChangeDescriptionAccountGroupRequest, Guid, AccountGroupDto>("{id:guid}/change-description")
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription("Change an account group's description.");

        group.MapPutById<ChangeMetadataAccountGroupRequest, Guid, AccountGroupDto>("{id:guid}/change-metadata")
            .RequireScope(group, ScopeNames.AccountsWrite)
            .WithDescription("Change an account group's metadata.");

        // Close (request/handler GEN from [CrudAction] on AccountGroup.Close, DRK-1418 §3 row 1; route HAND,
        // §3 row 8 deviation): the generated composite's MapActionById binds its command from the JSON body
        // only and requires one — every close call sends none, since the id comes entirely from the route —
        // so the route is hand-mapped instead, constructing the request from the route id and running
        // CloseAccountGroupRequestValidator explicitly before dispatch (FluentValidation's endpoint
        // auto-validation only inspects arguments already bound to the delegate, so it would never see a
        // request built after binding completes either way).
        group.MapPost("{id:guid}/close", async (
                Guid id,
                IMessageBus bus,
                IValidator<CloseAccountGroupRequest> validator,
                CancellationToken ct) =>
            {
                var request = new CloseAccountGroupRequest { Id = id };
                var validation = await validator.ValidateAsync(request, ct);
                if (!validation.IsValid)
                {
                    var failure = validation.Errors[0];
                    return Result.Fail<AccountGroupDto>(LedgerErrors.Error(failure.ErrorCode, failure.ErrorMessage))
                        .ToLedgerResponse();
                }

                var result = await bus.Send(request, cancellationToken: ct);
                return result.ToLedgerResponse();
            })
            .RequireScope(group, ScopeNames.AccountsWrite)
            .Produces<AccountGroupDto>()
            .WithDescription("Close an account group. Refused while any account it holds still carries a balance.");

        // Activate (request/handler GEN from [CrudAction] on AccountGroup.Activate, DRK-1418 §3 row 1; route
        // HAND for the same reason as Close — no other properties to bind from an empty body). No business
        // refusal, so no validator to run.
        group.MapPost("{id:guid}/activate", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var result = await bus.Send(new ActivateAccountGroupRequest { Id = id }, cancellationToken: ct);
                return result.ToLedgerResponse();
            })
            .RequireScope(group, ScopeNames.AccountsWrite)
            .Produces<AccountGroupDto>()
            .WithDescription("Reactivate a closed account group.");

        group.MapGet("{id:guid}/balances", async (
                Guid id,
                IMessageBus bus,
                CancellationToken ct) =>
            {
                var balances = await bus.Send(new GetAccountGroupBalancesQuery { Id = id }, cancellationToken: ct);
                return Results.Ok(balances);
            })
            .RequireScope(group, ScopeNames.AccountsRead)
            .WithDescription("Read a group's total balances, one line per currency — never combined.");
    }
}

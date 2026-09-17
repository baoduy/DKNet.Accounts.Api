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
        // Group-level scope declaration (DRK-1498 §3 rows 1-2, 5): every route this group registers for GET
        // needs accounts.read, and for POST/PUT/DELETE needs accounts.write, unless the route names its own
        // scope (none here do) or is anonymous.
        group.DeclareGroupScope(ScopeNames.AccountsRead, "GET")
            .DeclareGroupScope(ScopeNames.AccountsWrite, "POST", "PUT", "DELETE");

        // Create/List/GetById/Delete plus the three [CrudUpdate] members (Rename, ChangeDescription,
        // ChangeMetadata) all now register through one generated composite (DRK-1440 §3 rows 1-3). Close and
        // activate stay excluded BY NAME (R1): each is a [CrudAction] whose generated composite route binds
        // its command from the JSON body and requires one, but every call sends none (the id comes entirely
        // from the route) — DKNet gap DRK-1436, so both stay hand-mapped below (§3 row 5). Rename must stay the
        // first [CrudUpdate] declared on AccountGroup or it loses its plain "{id}" PUT route.
        group.MapAccountGroupCrud(o => o
                .Exclude("Close", "Activate")
                .Configure("Create", b => b.WithDescription("Create an account group."))
                .Configure("GetList", b => b.WithDescription(
                    "List account groups. Filter as 'field:operation:value', e.g. filter=Type:Equal:Customer."))
                .Configure("GetById", b => b.WithDescription("Read one account group."))
                .Configure("Rename", b => b.WithDescription("Rename an account group."))
                .Configure("ChangeDescription", b => b.WithDescription("Change an account group's description."))
                .Configure("ChangeMetadata", b => b.WithDescription("Change an account group's metadata."))
                .Configure("Delete", b => b.WithDescription("Delete an account group. Refused while the group still holds any account.")));

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
                    return CloseValidationFailureResponse(validation);
                }

                var result = await bus.Send(request, cancellationToken: ct);
                return result.ToLedgerResponse();
            })
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
            .WithDescription("Read a group's total balances, one line per currency — never combined.");
    }

    /// <summary>
    /// Only a failure whose <c>ErrorCode</c> is one of <see cref="LedgerErrorResponseOptions"/>' known stable
    /// codes is promoted to the ledger 422+code shape — correct even if <c>CloseAccountGroupRequestValidator</c>
    /// grows a second, uncoded rule later; anything else falls through to today's plain 400 validation-problem
    /// body. Internal (not a lambda) so it's directly testable without a real HTTP round trip.
    /// </summary>
    internal static IResult CloseValidationFailureResponse(FluentValidation.Results.ValidationResult validation)
    {
        var stableFailure = validation.Errors.FirstOrDefault(e => LedgerErrorResponseOptions.IsKnownCode(e.ErrorCode));
        if (stableFailure is not null)
        {
            return Result.Fail<AccountGroupDto>(LedgerErrors.Error(stableFailure.ErrorCode, stableFailure.ErrorMessage))
                .ToLedgerResponse();
        }

        return Results.ValidationProblem(validation.ToDictionary());
    }
}

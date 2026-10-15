using System.Globalization;
using DKNet.EfCore.Specifications.Extensions;
using DKNet.EfCore.Specifications.Repositories;
using DKNet.Accounts.AppServices.Accounts.V1.Specs;
using DKNet.Accounts.AppServices.Currencies.V1.Specs;
using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.AppServices.Postings.V1.Specs;
using DKNet.Accounts.AppServices.Transfers.V1.Queries;
using DKNet.Accounts.AppServices.Transfers.V1.Specs;
using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Domains.Features.Transfers.Entities;
using DKNet.Accounts.Domains.Share;
using Microsoft.EntityFrameworkCore;

namespace DKNet.Accounts.AppServices.Transfers.V1.Actions;

/// <summary>
/// Moves money from one account to a different one in 1 call (DRK-2276 §3a). <see cref="Amount"/> is the total
/// that leaves the source, <see cref="Fee"/> included. <see cref="Amount"/>, <see cref="Fee"/> and
/// <see cref="ExchangeRate"/> are nullable so a missing value is refused as missing (400), never read as 0.
/// <see cref="IdempotencyKey"/> is populated from the <c>Idempotency-Key</c> request header — a body field of
/// the same name is always overwritten — and lowercased on set, as on a posting.
/// </summary>
public sealed record RecordTransferRequest : Fluents.Requests.IWitResponse<TransferDto>
{
    public Guid SourceAccountId { get; set; }

    public Guid DestinationAccountId { get; set; }

    public decimal? Amount { get; set; }

    public string SourceCurrency { get; set; } = null!;

    public string DestinationCurrency { get; set; } = null!;

    /// <summary>Destination units per 1 source unit. Required when the currencies differ, refused when they
    /// are the same.</summary>
    public decimal? ExchangeRate { get; set; }

    public decimal? Fee { get; set; }

    /// <summary>Required when <see cref="Fee"/> is above 0, refused when it is 0.</summary>
    public Guid? FeeAccountId { get; set; }

    [FromRequestHeader("Idempotency-Key")]
    public string? IdempotencyKey { get; set => field = value?.ToLowerInvariant(); }
}

/// <summary>
/// Every refusal the spec puts on a field (R2), in the order R3 fixes: a missing input (400) first, then the
/// currencies, the amount, the accounts, the rate, the fee, the fee account and the converted amount — the
/// first failing rule is the only one reported. Database reads are scalar projections, never tracked
/// entities: this validator shares the handler's <c>DbContext</c>, and a tracked account read here would be
/// handed back to the handler after it takes the account lock, stale. A missing account passes the currency
/// rules; the handler refuses it as not found.
/// </summary>
internal sealed class RecordTransferCommandValidator : AbstractValidator<RecordTransferRequest>
{
    /// <summary>At most 10 digits before the decimal point and 8 after it (§3a).</summary>
    private const decimal MaxExchangeRate = 9_999_999_999.99999999m;

    private const int ExchangeRatePlaces = 8;

    public RecordTransferCommandValidator(IRepositorySpec repository, CurrencyDecimalPlaces decimalPlaces)
    {
        ClassLevelCascadeMode = CascadeMode.Stop;
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(r => r.SourceAccountId).NotEmpty();
        RuleFor(r => r.DestinationAccountId).NotEmpty();
        RuleFor(r => r.Amount).NotNull();
        RuleFor(r => r.SourceCurrency).NotEmpty().Length(3, 10);
        RuleFor(r => r.DestinationCurrency).NotEmpty().Length(3, 10);
        RuleFor(r => r.Fee).NotNull();
        RuleFor(r => r.IdempotencyKey).NotEmpty();

        RuleFor(r => r.SourceCurrency).MustAsync(IsOfferedAsync)
            .WithErrorCode(LedgerErrors.UnsupportedCurrency)
            .WithMessage("'{PropertyValue}' is not a supported currency.");
        RuleFor(r => r.DestinationCurrency).MustAsync(IsOfferedAsync)
            .WithErrorCode(LedgerErrors.UnsupportedCurrency)
            .WithMessage("'{PropertyValue}' is not a supported currency.");

        RuleFor(r => r.Amount)
            .Must((r, amount) => PostingAmount.Validate(amount!.Value, PlacesOf(r.SourceCurrency)) == PostingAmountValidation.Valid)
            .WithErrorCode(LedgerErrors.InvalidPostingAmount)
            .WithMessage("The amount must be positive and match the source currency's precision.");

        RuleFor(r => r.DestinationAccountId).NotEqual(r => r.SourceAccountId)
            .WithErrorCode(LedgerErrors.SameAccountTransfer)
            .WithMessage("The destination must be a different account from the source.");

        RuleFor(r => r.SourceCurrency).MustAsync((r, code, ct) => IsCurrencyOfAsync(r.SourceAccountId, code, ct))
            .WithErrorCode(LedgerErrors.CurrencyMismatch)
            .WithMessage("The source currency does not match the source account's.");
        RuleFor(r => r.DestinationCurrency).MustAsync((r, code, ct) => IsCurrencyOfAsync(r.DestinationAccountId, code, ct))
            .WithErrorCode(LedgerErrors.CurrencyMismatch)
            .WithMessage("The destination currency does not match the destination account's.");

        RuleFor(r => r.ExchangeRate)
            .Must((r, rate) => rate is not null || SameCurrency(r))
            .WithErrorCode(LedgerErrors.ExchangeRateRequired)
            .WithMessage("A rate is required when the currencies differ.")
            .Must((r, rate) => rate is null || !SameCurrency(r))
            .WithErrorCode(LedgerErrors.ExchangeRateNotAllowed)
            .WithMessage("No rate is allowed when the currencies are the same.")
            .Must(rate => rate is null
                || (rate > 0m && rate <= MaxExchangeRate && PostingAmount.HasAtMostPlaces(rate.Value, ExchangeRatePlaces)))
            .WithErrorCode(LedgerErrors.InvalidExchangeRate)
            .WithMessage("The rate must be above 0, with at most 8 decimal places and 10 digits before the point.");

        RuleFor(r => r.Fee)
            .Must((r, fee) => fee >= 0m && fee < r.Amount && PostingAmount.HasAtMostPlaces(fee!.Value, PlacesOf(r.SourceCurrency)))
            .WithErrorCode(LedgerErrors.InvalidFee)
            .WithMessage("The fee must be 0 or more, less than the amount and match the source currency's precision.");

        RuleFor(r => r.FeeAccountId)
            .Must((r, feeAccountId) => feeAccountId is not null || r.Fee == 0m)
            .WithErrorCode(LedgerErrors.FeeAccountRequired)
            .WithMessage("A fee account is required when the fee is above 0.")
            .Must((r, feeAccountId) => feeAccountId is null || (r.Fee > 0m && feeAccountId != r.SourceAccountId))
            .WithErrorCode(LedgerErrors.InvalidFeeAccount)
            .WithMessage("A fee account is allowed only with a fee above 0, and must not be the source.")
            .MustAsync((r, feeAccountId, ct) => feeAccountId is null ? Task.FromResult(true) : IsCurrencyOfAsync(feeAccountId.Value, r.SourceCurrency, ct))
            .WithErrorCode(LedgerErrors.InvalidFeeAccount)
            .WithMessage("The fee account must be in the source currency.");

        // An amount beyond the ceiling is the handler's AMOUNT_OUT_OF_RANGE; converting it could overflow.
        RuleFor(r => r.Amount)
            .Must((r, amount) => PostingAmount.ExceedsCeiling(amount!.Value)
                || TransferConversion.Convert(amount.Value, r.Fee!.Value, r.ExchangeRate, PlacesOf(r.DestinationCurrency)) > 0m)
            .WithErrorCode(LedgerErrors.ConvertedAmountTooSmall)
            .WithMessage("The converted amount rounds to 0 in the destination currency.");
        return;

        Task<bool> IsOfferedAsync(string code, CancellationToken ct) =>
            repository.Query(new SpecGetCurrency(byCode: code.ToUpperInvariant())).AnyAsync(c => c.IsActive, ct);

        async Task<bool> IsCurrencyOfAsync(Guid accountId, string code, CancellationToken ct) =>
            await repository.Query(new SpecGetAccount(accountId)).Select(a => a.CurrencyCode).FirstOrDefaultAsync(ct)
                is not { } accountCurrency || string.Equals(accountCurrency, code, StringComparison.OrdinalIgnoreCase);

        // Both currencies are known by the time a rule asks for their places (the rules above ran first).
        int PlacesOf(string code) => decimalPlaces.Of(code).GetValueOrDefault();
    }

    private static bool SameCurrency(RecordTransferRequest request) =>
        string.Equals(request.SourceCurrency, request.DestinationCurrency, StringComparison.OrdinalIgnoreCase);
}

/// <summary>
/// Records the transfer and its 2 or 4 postings in one save (R7, R9), under the same per-account locks a batch
/// takes — every distinct account, in ascending id order — so the floor of each account sees every leg of
/// this transfer and no other writer in between. One <see cref="Account"/> instance per account: the source's
/// floor is checked against the full amount, and a fee account that is also the destination takes both
/// credits. Any refusal returns before the save, so nothing is recorded.
/// </summary>
internal sealed class RecordTransferCommandHandler(
    IRepositorySpec repository,
    IMapper mapper,
    IPostingNumberGenerator postingNumbers,
    IAccountLockProvider locks,
    ICallingSystemAccessor callingSystem,
    TimeProvider clock)
    : Fluents.Requests.IHandler<RecordTransferRequest, TransferDto>
{
    public async Task<IResult<TransferDto>> OnHandle(RecordTransferRequest request, CancellationToken cancellationToken)
    {
        var callingSystemId = callingSystem.CallingSystem;
        if (string.IsNullOrEmpty(callingSystemId))
        {
            return Result.Fail<TransferDto>("The caller is not authenticated.");
        }

        // Fails closed rather than trusting the validator to have run: SpecGetPosting skips its key clause on a
        // null key, so the key check below would match an arbitrary posting.
        if (string.IsNullOrEmpty(request.IdempotencyKey))
        {
            return Result.Fail<TransferDto>("An Idempotency-Key header is required to record a transfer.");
        }

        // Pre-lock, with the same accepted race as RecordPostingCommandHandler: two simultaneous first uses of
        // one key both miss here, and the database's unique index refuses the second with 409.
        if (await CheckKeyAsync(request, callingSystemId, cancellationToken) is { } answered)
        {
            return answered;
        }

        // Converting an amount beyond the ceiling could overflow; it could never be stored either.
        if (PostingAmount.ExceedsCeiling(request.Amount!.Value))
        {
            return Result.Fail<TransferDto>(PostingRefusalReason.AmountOutOfRange.ToError());
        }

        var acquired = await AcquireLocksAsync(request, cancellationToken);
        if (acquired is null)
        {
            return Result.Fail<TransferDto>(LedgerErrors.Error(
                LedgerErrors.LockTimeout, "Timed out waiting to record against one of this transfer's accounts."));
        }

        try
        {
            return await RecordAsync(request, callingSystemId, cancellationToken);
        }
        finally
        {
            foreach (var handle in acquired)
            {
                handle.Dispose();
            }
        }
    }

    /// <summary>Locks every distinct account the transfer names, in ascending id order, as a batch does
    /// (<c>RecordBatch.cs</c>), so two transfers sharing accounts never deadlock. Null, with every lock already
    /// taken released, when one of them times out.</summary>
    private async Task<List<IDisposable>?> AcquireLocksAsync(
        RecordTransferRequest request, CancellationToken cancellationToken)
    {
        var accountIds = new[] { request.SourceAccountId, request.DestinationAccountId, request.FeeAccountId }
            .OfType<Guid>().Distinct().Order().ToList();
        var acquired = new List<IDisposable>();
        try
        {
            foreach (var accountId in accountIds)
            {
                acquired.Add(await locks.AcquireAsync(accountId, PostingLocking.LockTimeout, cancellationToken));
            }

            return acquired;
        }
        catch (TimeoutException)
        {
            foreach (var handle in acquired)
            {
                handle.Dispose();
            }

            return null;
        }
    }

    /// <summary>R4: a transfer already recorded under this key replays when its content is the same and is
    /// refused when it is not; a posting, batch or reversal recorded under it is always refused. Null when the
    /// key is unused.</summary>
    private async Task<IResult<TransferDto>?> CheckKeyAsync(
        RecordTransferRequest request, string callingSystemId, CancellationToken cancellationToken)
    {
        var existing = await repository.FirstOrDefaultAsync(
            new SpecGetTransfer(callingSystemId, request.IdempotencyKey!), cancellationToken);
        if (existing is not null)
        {
            return IsSameContent(existing, request)
                ? LedgerErrors.Replayed(await TransferReading.ToDtoAsync(repository, mapper, existing, cancellationToken))
                : KeyConflict();
        }

        var posting = await repository.Query(
                new SpecGetPosting(byCallingSystem: callingSystemId, byIdempotencyKey: request.IdempotencyKey))
            .AnyAsync(cancellationToken);
        return posting ? KeyConflict() : null;
    }

    private static Result<TransferDto> KeyConflict() =>
        Result.Fail<TransferDto>(LedgerErrors.Error(
            LedgerErrors.IdempotencyKeyConflict, "This idempotency key was already used for a different request."));

    private static bool IsSameContent(Transfer transfer, RecordTransferRequest request) =>
        transfer.SourceAccountId == request.SourceAccountId
        && transfer.DestinationAccountId == request.DestinationAccountId
        && transfer.Amount == request.Amount
        && string.Equals(transfer.SourceCurrency, request.SourceCurrency, StringComparison.OrdinalIgnoreCase)
        && string.Equals(transfer.DestinationCurrency, request.DestinationCurrency, StringComparison.OrdinalIgnoreCase)
        && transfer.ExchangeRate == request.ExchangeRate
        && transfer.Fee == request.Fee
        && transfer.FeeAccountId == request.FeeAccountId;

    /// <summary>Reads the locked accounts, applies every leg and saves once. Runs under the account locks.</summary>
    private async Task<IResult<TransferDto>> RecordAsync(
        RecordTransferRequest request, string callingSystemId, CancellationToken cancellationToken)
    {
        var loaded = await LoadAccountsAsync(request, cancellationToken);
        if (loaded.IsFailed)
        {
            return Result.Fail<TransferDto>(loaded.Errors);
        }

        var accounts = loaded.Value;
        var amount = request.Amount!.Value;
        var fee = request.Fee!.Value;
        var source = accounts[request.SourceAccountId];
        var destination = accounts[request.DestinationAccountId];
        var destinationPlaces = await repository.Query(new SpecGetCurrency(byCode: destination.CurrencyCode))
            .Select(c => c.DecimalPlaces).FirstAsync(cancellationToken);
        var transfer = new Transfer(
            source.Id, destination.Id, amount, source.CurrencyCode, destination.CurrencyCode, request.ExchangeRate,
            fee, request.FeeAccountId,
            TransferConversion.Convert(amount, fee, request.ExchangeRate, destinationPlaces),
            clock.GetUtcNow(), callingSystemId, request.IdempotencyKey!);

        var legs = new List<(Account Account, PostingDirection Direction, decimal Amount, PostingCategory Category)>
        {
            (source, PostingDirection.Debit, amount - fee, PostingCategory.Transfer),
            (destination, PostingDirection.Credit, transfer.ConvertedAmount, PostingCategory.Transfer)
        };
        if (fee > 0m)
        {
            legs.Add((source, PostingDirection.Debit, fee, PostingCategory.Fee));
            legs.Add((accounts[request.FeeAccountId!.Value], PostingDirection.Credit, fee, PostingCategory.Fee));
        }

        var postings = await ApplyLegsAsync(transfer, legs);
        if (postings.IsFailed)
        {
            return Result.Fail<TransferDto>(postings.Errors);
        }

        await repository.AddAsync(transfer, cancellationToken);
        await repository.AddRangeAsync(postings.Value, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);

        return Result.Ok(await TransferReading.ToDtoAsync(repository, mapper, transfer, cancellationToken));
    }

    /// <summary>Each distinct account the transfer names, read once; a missing one is not found, and the
    /// message names the request field that pointed at it.</summary>
    private async Task<Result<Dictionary<Guid, Account>>> LoadAccountsAsync(
        RecordTransferRequest request, CancellationToken cancellationToken)
    {
        var accounts = new Dictionary<Guid, Account>();
        foreach (var (accountId, field) in new[]
                 {
                     ((Guid?)request.SourceAccountId, "sourceAccountId"),
                     (request.DestinationAccountId, "destinationAccountId"),
                     (request.FeeAccountId, "feeAccountId")
                 })
        {
            if (accountId is not { } id || accounts.ContainsKey(id))
            {
                continue;
            }

            var account = await repository.FirstOrDefaultAsync(new SpecGetAccount(id), cancellationToken);
            if (account is null)
            {
                return Result.Fail(new NotFoundError($"The account {id} named by {field} was not found."));
            }

            accounts[id] = account;
        }

        return accounts;
    }

    /// <summary>Applies each leg, in order, to its account's one instance and builds its posting (R7). The first
    /// refusal stops the transfer. The key lives on the first posting (R5), so a single posting, batch or
    /// reversal sent later under it finds that posting and is refused with 409 — no transfer signature can
    /// equal theirs.</summary>
    private async Task<Result<List<Posting>>> ApplyLegsAsync(
        Transfer transfer,
        IReadOnlyList<(Account Account, PostingDirection Direction, decimal Amount, PostingCategory Category)> legs)
    {
        var postings = new List<Posting>(legs.Count);
        foreach (var leg in legs)
        {
            var application = leg.Account.TryApplyPosting(leg.Direction == PostingDirection.Debit, leg.Amount, transfer.RecordedAt);
            if (!application.Success)
            {
                return Result.Fail(application.Refusal.ToError());
            }

            postings.Add(new Posting(
                leg.Account.Id, await postingNumbers.NextValueAsync(), application.Position, leg.Direction, leg.Amount,
                leg.Account.CurrencyCode, application.SignedValue, application.BalanceAfter,
                DateOnly.FromDateTime(transfer.RecordedAt.UtcDateTime), transfer.RecordedAt, leg.Category, transfer.Id,
                null, null, transfer.CallingSystem, null, null, null, null, null));
        }

        postings[0].StampIdempotency(
            transfer.IdempotencyKey,
            PostingSignature.Hash(string.Create(CultureInfo.InvariantCulture, $"transfer|{transfer.Id}")));
        return postings;
    }
}

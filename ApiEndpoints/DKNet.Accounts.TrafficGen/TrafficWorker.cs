using DKNet.Accounts.Client;
using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.TrafficGen;

/// <summary>Every <c>TrafficGen:IntervalSeconds</c> (default 5) creates a group — cycling through every
/// <see cref="AccountGroupType"/> — and, for <c>TrafficGen:CurrenciesPerCycle</c> (default 3) randomly picked
/// active currencies, opens a pair of accounts in each and drives credits, fee debits and transfers until every
/// account holds at least <c>TrafficGen:PostingsPerAccount</c> (default 110) postings. Each pair's second
/// account then ends in a rotating <see cref="AccountStatus"/> (Active, Frozen, Dormant, Closed).</summary>
internal sealed class TrafficWorker(IAccountClient client, IConfiguration config, ILogger<TrafficWorker> logger)
    : BackgroundService
{
    private static readonly AccountGroupType[] GroupTypes = Enum.GetValues<AccountGroupType>();
    private static readonly AccountStatus[] AccountStatuses = Enum.GetValues<AccountStatus>();

    private IReadOnlyList<CurrencyDto>? _currencies;
    private int _cycle;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(config.GetValue("TrafficGen:IntervalSeconds", 5));
        using var timer = new PeriodicTimer(interval);
        do
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (AccountApiException ex)
            {
                logger.LogWarning("Cycle refused: {Status} {@Errors}", ex.StatusCode, ex.Errors);
            }
            catch (HttpRequestException ex)
            {
                logger.LogWarning("Api unreachable: {Message}", ex.Message);
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        _currencies ??= (await client.GetCurrenciesAsync(new CurrenciesListQuery { PageSize = 100 }, ct))
            .Items.Where(c => c.IsActive).ToList();
        var shuffled = _currencies.ToArray();
        Random.Shared.Shuffle(shuffled);
        var picked = shuffled.Take(config.GetValue("TrafficGen:CurrenciesPerCycle", 3)).ToList();

        // Rotating by cycle guarantees every group type and every account status shows up within a few cycles.
        var cycle = _cycle++;
        var type = GroupTypes[cycle % GroupTypes.Length];
        var code = new string(Random.Shared.GetItems("ABCDEFGHJKLMNPQRSTUVWXYZ23456789".AsSpan(), 5));
        var group = await client.CreateAccountGroupAsync(new CreateAccountGroupRequest
        {
            Code = code,
            Name = $"TrafficGen {type} {code}",
            Type = type,
            OwnerId = "traffic-gen",
        }, ct);

        // Every Nth group is closed. 4 and the 5 group types share no factor, so the closed ones rotate through
        // every type too.
        var closeGroup = cycle % config.GetValue("TrafficGen:CloseGroupEvery", 4) == 3;

        // Each currency's pair only touches its own two accounts, so the pairs run side by side.
        await Task.WhenAll(picked.Select((c, i) =>
            RunPairAsync(group.Id, c, AccountStatuses[(cycle + i) % AccountStatuses.Length], closeGroup, ct)));
        if (closeGroup) await client.CloseAccountGroupAsync(group.Id, ct);

        logger.LogInformation("{Type} group {Group} ({GroupId}) done{Closed}: {Currencies}",
            type, group.Code, group.Id, closeGroup ? " and closed" : "", string.Join(", ", picked.Select(c => c.Code)));
    }

    /// <summary>Wallet A always stays Active; wallet B ends in <paramref name="finalStatus"/>. When
    /// <paramref name="drain"/> is set both wallets are emptied first, because the ledger refuses to close a
    /// group that still carries a balance.</summary>
    private async Task RunPairAsync(Guid groupId, CurrencyDto currency, AccountStatus finalStatus, bool drain,
        CancellationToken ct)
    {
        var target = config.GetValue("TrafficGen:PostingsPerAccount", 110);
        var accounts = new[]
        {
            new Wallet(await OpenAsync(groupId, $"{currency.Code} Wallet A", currency.Code, ct)),
            new Wallet(await OpenAsync(groupId, $"{currency.Code} Wallet B", currency.Code, ct)),
        };

        // Balances are tracked locally so a debit or transfer never asks the ledger to breach its zero floor.
        while (accounts.Min(w => w.Postings) < target)
        {
            var from = accounts[Random.Shared.Next(2)];
            var to = accounts[0] == from ? accounts[1] : accounts[0];
            var roll = Random.Shared.Next(10);

            if (roll < 4 || from.Balance < 10m)
            {
                var amount = RandomAmount(currency.DecimalPlaces);
                await PostAsync(from, PostingDirection.Credit, amount, currency.Code, PostingCategory.Payment,
                    "TrafficGen top-up", ct);
                from.Balance += amount;
            }
            else if (roll < 6)
            {
                var fee = Math.Min(RandomAmount(currency.DecimalPlaces) / 20m, from.Balance / 4m);
                fee = Math.Round(fee, currency.DecimalPlaces, MidpointRounding.ToZero);
                if (fee <= 0m) continue;
                await PostAsync(from, PostingDirection.Debit, fee, currency.Code, PostingCategory.Fee,
                    "TrafficGen fee", ct);
                from.Balance -= fee;
            }
            else
            {
                var transfer = Math.Round(from.Balance * (decimal)Random.Shared.NextDouble() / 2m,
                    currency.DecimalPlaces, MidpointRounding.ToZero);
                if (transfer <= 0m) continue;
                await TransferAsync(from, to, transfer, currency.Code, ct);
            }
        }

        var (a, b) = (accounts[0], accounts[1]);

        // Sweep before re-statusing: a Frozen or Dormant wallet can no longer be debited. The ledger refuses to
        // close an account that still holds a balance, so a closing wallet B is swept into A.
        if ((drain || finalStatus == AccountStatus.Closed) && b.Balance > 0m)
            await TransferAsync(b, a, b.Balance, currency.Code, ct);
        if (drain && a.Balance > 0m)
        {
            var payout = a.Balance;
            await PostAsync(a, PostingDirection.Debit, payout, currency.Code, PostingCategory.Payment,
                "TrafficGen payout", ct);
            a.Balance -= payout;
        }

        if (finalStatus != AccountStatus.Active)
            await client.UpdateAccountAsync(b.Account.Id, finalStatus, overdraftLimit: null, minimumBalance: null, ct: ct);

        logger.LogInformation("{Currency}: {A} ({APostings} postings, {ABalance}), {B} ({BPostings} postings, {BBalance}, {Status})",
            currency.Code, a.Account.AccountNumber, a.Postings, a.Balance,
            b.Account.AccountNumber, b.Postings, b.Balance, finalStatus);
    }

    private async Task TransferAsync(Wallet from, Wallet to, decimal amount, string currency, CancellationToken ct)
    {
        await client.RecordPostingBatchAsync(new RecordPostingBatchRequest
        {
            TransactionGroupId = Guid.NewGuid(),
            Movements =
            [
                Movement(from.Account.Id, PostingDirection.Debit, amount, currency, to.Account.Id),
                Movement(to.Account.Id, PostingDirection.Credit, amount, currency, from.Account.Id),
            ],
        }, Guid.NewGuid().ToString(), ct);
        from.Balance -= amount;
        to.Balance += amount;
        from.Postings++;
        to.Postings++;
    }

    private async Task PostAsync(Wallet wallet, PostingDirection direction, decimal amount, string currency,
        PostingCategory category, string description, CancellationToken ct)
    {
        await client.RecordPostingAsync(new RecordPostingRequest
        {
            AccountId = wallet.Account.Id,
            Direction = direction,
            Amount = amount,
            Currency = currency,
            Category = category,
            Description = description,
        }, Guid.NewGuid().ToString(), ct);
        wallet.Postings++;
    }

    /// <summary>10.00–10,000.00, rounded to the currency's precision (JPY → whole yen).</summary>
    private static decimal RandomAmount(int decimalPlaces) =>
        Math.Round(Random.Shared.Next(1_000, 1_000_000) / 100m, decimalPlaces, MidpointRounding.ToZero);

    private Task<AccountDto> OpenAsync(Guid groupId, string name, string currency, CancellationToken ct) =>
        client.OpenAccountAsync(new OpenAccountRequest
        {
            GroupId = groupId,
            Name = name,
            Currency = currency,
            Classification = AccountClassification.Liability,
        }, ct);

    private static PostingBatchMovement Movement(Guid account, PostingDirection direction, decimal amount,
        string currency, Guid counterparty) =>
        new()
        {
            AccountId = account,
            Direction = direction,
            Amount = amount,
            Currency = currency,
            Category = PostingCategory.Transfer,
            CounterpartyAccountId = counterparty,
            Description = "TrafficGen transfer",
        };

    private sealed class Wallet(AccountDto account)
    {
        public AccountDto Account { get; } = account;
        public decimal Balance { get; set; }
        public int Postings { get; set; }
    }
}

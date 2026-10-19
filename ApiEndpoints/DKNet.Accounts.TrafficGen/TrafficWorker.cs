using DKNet.Accounts.Client;
using DKNet.Accounts.Client.Contracts;

namespace DKNet.Accounts.TrafficGen;

/// <summary>Every <c>TrafficGen:IntervalSeconds</c> (default 5) creates a group — cycling through every
/// <see cref="AccountGroupType"/> — and, for <c>TrafficGen:CurrenciesPerCycle</c> (default 3) randomly picked
/// active currencies, opens 2 wallets and a "<c>CODE</c> Fees" account in each. It drives top-ups, stand-alone fee
/// debits and transfers until every wallet holds at least <c>TrafficGen:PostingsPerAccount</c> (default 110)
/// postings; about 1 in 3 transfers carries a 1% fee paid to the source currency's Fees account. A cycle with 2 or
/// more currencies then sends 3 cross-currency transfers between its A wallets at a random demo rate. Each
/// currency's wallet B then ends in a rotating <see cref="AccountStatus"/> (Active, Frozen, Dormant, Closed).</summary>
internal sealed class TrafficWorker(IAccountClient client, IConfiguration config, ILogger<TrafficWorker> logger)
    : BackgroundService
{
    private static readonly AccountGroupType[] GroupTypes = Enum.GetValues<AccountGroupType>();
    private static readonly AccountStatus[] AccountStatuses = Enum.GetValues<AccountStatus>();

    private const decimal FeeRate = 0.01m;
    private const int FeeOneIn = 3;
    private const decimal MinDemoRate = 0.5m;
    private const decimal MaxDemoRate = 2.0m;
    private const int DemoRatePlaces = 4;
    private const int CrossTransfersPerCycle = 3;

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

        // Filling and settling a currency only touch its own accounts, so the currencies run side by side. A
        // cross-currency transfer touches 2 currencies, so those run one at a time in between: after every fill,
        // while every wallet is still Active and before any account is emptied.
        var currencies = await Task.WhenAll(picked.Select((c, i) =>
            FillAsync(group.Id, c, AccountStatuses[(cycle + i) % AccountStatuses.Length], ct)));
        if (currencies.Length >= 2) await CrossCurrencyAsync(currencies, ct);
        await Task.WhenAll(currencies.Select(c => SettleAsync(c, closeGroup, ct)));
        if (closeGroup) await client.CloseAccountGroupAsync(group.Id, ct);

        logger.LogInformation("{Type} group {Group} ({GroupId}) done{Closed}: {Currencies}",
            type, group.Code, group.Id, closeGroup ? " and closed" : "", string.Join(", ", picked.Select(c => c.Code)));
    }

    /// <summary>Opens the currency's 2 wallets and its Fees account, then drives the wallets until both reach the
    /// posting target. The Fees account does not count toward it.</summary>
    private async Task<CurrencyAccounts> FillAsync(Guid groupId, CurrencyDto currency, AccountStatus finalStatus,
        CancellationToken ct)
    {
        var target = config.GetValue("TrafficGen:PostingsPerAccount", 110);
        var pair = new CurrencyAccounts(currency, finalStatus,
            new Wallet(await OpenAsync(groupId, $"{currency.Code} Wallet A", currency.Code, ct)),
            new Wallet(await OpenAsync(groupId, $"{currency.Code} Wallet B", currency.Code, ct)),
            new Wallet(await OpenAsync(groupId, $"{currency.Code} Fees", currency.Code, ct)));
        var accounts = new[] { pair.A, pair.B };

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
                await TransferAsync(from, to, pair.Fees, transfer, DrawFee(transfer, currency.DecimalPlaces),
                    rate: null, ct);
            }
        }

        return pair;
    }

    /// <summary>Sends exactly <see cref="CrossTransfersPerCycle"/> transfers, each from one currency's wallet A to
    /// another currency's wallet A, of up to half the source's balance at a random demo rate. A source below 10 is
    /// topped up first, so a draw can always succeed; a draw the ledger would refuse (an amount or a converted
    /// amount of 0) is drawn again.</summary>
    private async Task CrossCurrencyAsync(CurrencyAccounts[] currencies, CancellationToken ct)
    {
        var sent = 0;
        while (sent < CrossTransfersPerCycle)
        {
            var i = Random.Shared.Next(currencies.Length);
            var source = currencies[i];
            var destination = currencies[(i + 1 + Random.Shared.Next(currencies.Length - 1)) % currencies.Length];
            var (from, places) = (source.A, source.Currency.DecimalPlaces);

            if (from.Balance < 10m)
            {
                var topUp = RandomAmount(places);
                await PostAsync(from, PostingDirection.Credit, topUp, source.Currency.Code, PostingCategory.Payment,
                    "TrafficGen top-up", ct);
                from.Balance += topUp;
            }

            var amount = Math.Round(from.Balance * (decimal)Random.Shared.NextDouble() / 2m, places,
                MidpointRounding.ToZero);
            var fee = DrawFee(amount, places);
            var rate = Math.Round(MinDemoRate + (decimal)Random.Shared.NextDouble() * (MaxDemoRate - MinDemoRate),
                DemoRatePlaces);
            var converted = Math.Round((amount - fee) * rate, destination.Currency.DecimalPlaces,
                MidpointRounding.AwayFromZero);
            if (amount <= 0m || converted <= 0m) continue;

            await TransferAsync(from, destination.A, source.Fees, amount, fee, rate, ct);
            sent++;
        }
    }

    /// <summary>Wallet A always stays Active; wallet B ends in its final status. When <paramref name="drain"/> is
    /// set every account is emptied first, the Fees account included, because the ledger refuses to close a group
    /// that still carries a balance.</summary>
    private async Task SettleAsync(CurrencyAccounts pair, bool drain, CancellationToken ct)
    {
        var (a, b, fees) = (pair.A, pair.B, pair.Fees);
        var code = pair.Currency.Code;

        // Sweep before re-statusing: a Frozen or Dormant wallet can no longer be debited. The ledger refuses to
        // close an account that still holds a balance, so a closing wallet B is swept into A, without a fee.
        if ((drain || pair.FinalStatus == AccountStatus.Closed) && b.Balance > 0m)
            await TransferAsync(b, a, fees, b.Balance, fee: 0m, rate: null, ct);
        if (drain)
        {
            await PayOutAsync(a, code, ct);
            await PayOutAsync(fees, code, ct);
        }

        if (pair.FinalStatus != AccountStatus.Active)
            await client.UpdateAccountAsync(b.Account.Id, pair.FinalStatus, overdraftLimit: null, minimumBalance: null,
                ct: ct);

        logger.LogInformation(
            "{Currency}: {A} ({APostings} postings, {ABalance}), {B} ({BPostings} postings, {BBalance}, {Status}), {Fees} ({FeesPostings} postings, {FeesBalance})",
            code, a.Account.AccountNumber, a.Postings, a.Balance,
            b.Account.AccountNumber, b.Postings, b.Balance, pair.FinalStatus,
            fees.Account.AccountNumber, fees.Postings, fees.Balance);
    }

    /// <summary>Records a transfer through the transfer route. A <paramref name="fee"/> above 0 is paid to
    /// <paramref name="feeAccount"/>; <paramref name="rate"/> is set only between 2 currencies. The local balances
    /// follow the ledger's own figures from its answer, so a drain leaves every account at exactly 0.</summary>
    private async Task TransferAsync(Wallet from, Wallet to, Wallet feeAccount, decimal amount, decimal fee,
        decimal? rate, CancellationToken ct)
    {
        var transfer = await client.RecordTransferAsync(new RecordTransferRequest
        {
            SourceAccountId = from.Account.Id,
            DestinationAccountId = to.Account.Id,
            Amount = amount,
            SourceCurrency = from.Account.Currency,
            DestinationCurrency = to.Account.Currency,
            ExchangeRate = rate,
            Fee = fee,
            FeeAccountId = fee > 0m ? feeAccount.Account.Id : null,
        }, Guid.NewGuid().ToString(), ct);
        from.Balance -= transfer.Amount;
        to.Balance += transfer.ConvertedAmount;
        feeAccount.Balance += transfer.Fee;
        from.Postings++;
        to.Postings++;
        if (transfer.Fee > 0m)
        {
            from.Postings++;
            feeAccount.Postings++;
        }
    }

    /// <summary>About 1 in <see cref="FeeOneIn"/> draws is a fee of <see cref="FeeRate"/> of the amount, rounded
    /// down to the source currency's places; one that rounds to 0 is no fee.</summary>
    private static decimal DrawFee(decimal amount, int decimalPlaces) =>
        Random.Shared.Next(FeeOneIn) == 0
            ? Math.Round(amount * FeeRate, decimalPlaces, MidpointRounding.ToZero)
            : 0m;

    private async Task PayOutAsync(Wallet wallet, string currency, CancellationToken ct)
    {
        if (wallet.Balance <= 0m) return;
        var payout = wallet.Balance;
        await PostAsync(wallet, PostingDirection.Debit, payout, currency, PostingCategory.Payment,
            "TrafficGen payout", ct);
        wallet.Balance -= payout;
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

    /// <summary>One currency's accounts in the cycle's group, and the status its wallet B ends in.</summary>
    private sealed record CurrencyAccounts(CurrencyDto Currency, AccountStatus FinalStatus, Wallet A, Wallet B,
        Wallet Fees);

    private sealed class Wallet(AccountDto account)
    {
        public AccountDto Account { get; } = account;
        public decimal Balance { get; set; }
        public int Postings { get; set; }
    }
}

namespace DKNet.Accounts.Client.Contracts;

/// <summary>Mirrors the service's <c>AccountGroupType</c> — the accounting-classification role a group of
/// accounts plays.</summary>
public enum AccountGroupType
{
    Customer,
    Merchant,
    Internal,
    Suspense,
    Settlement
}

/// <summary>Mirrors the service's <c>AccountGroupStatus</c>.</summary>
public enum AccountGroupStatus
{
    Active,
    Closed
}

/// <summary>Mirrors the service's <c>AccountClassification</c>.</summary>
public enum AccountClassification
{
    Asset,
    Liability,
    Equity,
    Income,
    Expense
}

/// <summary>Mirrors the service's <c>AccountStatus</c>.</summary>
public enum AccountStatus
{
    Active,
    Frozen,
    Dormant,
    Closed
}

/// <summary>Mirrors the service's <c>PostingDirection</c>.</summary>
public enum PostingDirection
{
    Credit,
    Debit
}

/// <summary>Mirrors the service's <c>PostingCategory</c>.</summary>
public enum PostingCategory
{
    Transfer,
    Payment,
    Fee,
    Interest,
    Adjustment,
    Refund,
    Reversal,
    OpeningBalance
}

/// <summary>Mirrors the service's <c>PostingStatus</c>.</summary>
public enum PostingStatus
{
    Posted,
    Reversed
}

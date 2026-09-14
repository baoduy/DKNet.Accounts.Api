namespace DKNet.Accounts.Domains.Share;

/// <summary>
/// The outcome of checking a candidate posting amount against a <see cref="Currency"/>.
/// </summary>
public enum PostingAmountValidation
{
    Valid,
    NotPositive,
    PrecisionExceeded
}

/// <summary>
/// Validation entry point for a posting amount: it must be strictly positive and must never carry more
/// decimal places than its currency permits.
/// </summary>
public static class PostingAmount
{
    public static PostingAmountValidation Validate(decimal amount, Currency currency) =>
        throw new NotImplementedException();
}

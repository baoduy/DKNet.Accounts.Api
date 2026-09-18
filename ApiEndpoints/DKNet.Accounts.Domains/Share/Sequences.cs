using DKNet.EfCore.Abstractions.Attributes;

namespace DKNet.Accounts.Domains.Share;

[SqlSequence]
public enum Sequences
{
    None = 0,

    [Sequence(typeof(int), FormatString = "T{DateTime:yyMMdd}{1:00000}", Max = 99999)]
    Membership = 1,

    /// <summary>The generated 10-digit suffix of an account number, used when the caller supplies none.
    /// It is only the suffix: the stored number is <c>{AccountGroup.Code}-{suffix}</c>, and uniqueness is
    /// enforced by the database unique index on <c>Account.AccountNumber</c>, not by this sequence alone
    /// (a caller-supplied suffix bypasses the sequence entirely).</summary>
    [Sequence(typeof(long), FormatString = "{1:0000000000}", Max = 9999999999)]
    AccountNumber = 2,

    /// <summary>Service-generated, unique posting number. Uniqueness is enforced by the database unique
    /// index on <c>Posting.PostingNumber</c>, not by this sequence alone.</summary>
    [Sequence(typeof(long), FormatString = "PST{1:0000000000}", Max = 9999999999)]
    PostingNumber = 3
}
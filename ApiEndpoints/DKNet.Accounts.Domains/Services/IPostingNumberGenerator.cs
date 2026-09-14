namespace DKNet.Accounts.Domains.Services;

/// <summary>
/// Generates the service-wide unique posting number stamped on a newly recorded <c>Posting</c>. Uniqueness is
/// enforced by a database unique index on the generated value, not by this service alone — callers must not
/// treat "generated" as "guaranteed unused" without that index in place.
/// </summary>
public interface IPostingNumberGenerator : ISequenceServices;

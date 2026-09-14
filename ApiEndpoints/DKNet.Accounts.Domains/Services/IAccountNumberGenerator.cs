namespace DKNet.Accounts.Domains.Services;

/// <summary>
/// Generates the service-wide unique account number stamped on a newly opened <c>Account</c> (§3 row 5).
/// Uniqueness is enforced by a database unique index on the generated value, not by this service alone —
/// callers must not treat "generated" as "guaranteed unused" without that index in place.
/// </summary>
public interface IAccountNumberGenerator : ISequenceServices;

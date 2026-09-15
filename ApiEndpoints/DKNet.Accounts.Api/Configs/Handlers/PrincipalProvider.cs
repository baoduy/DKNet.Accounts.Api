namespace DKNet.Accounts.Api.Configs.Handlers;

internal sealed class PrincipalProvider(IHttpContextAccessor accessor) : IPrincipalProvider
{
    #region Fields

    private string _email = null!;
    private bool _initialized;
    private string? _ownershipKey;
    private string _userName = null!;

    #endregion

    #region Properties

    public Guid ProfileId
    {
        get
        {
            Initialize();
            return Guid.TryParse(_ownershipKey, out var id) ? id : Guid.Empty;
        }
    }

    public string Email
    {
        get
        {
            Initialize();
            return _email;
        }
    }

    public string UserName
    {
        get
        {
            Initialize();
            return _userName;
        }
    }

    #endregion

    #region Methods

    public string? GetOwnershipKey()
    {
        Initialize();
        return _ownershipKey;
    }

    private void Initialize()
    {
        var context = accessor.HttpContext;
        if (context == null)
        {
            return;
        }

        if (_initialized)
        {
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true)
        {
            _ownershipKey = SharedConsts.SystemAccount;
            _initialized = true;
            return;
        }

        _userName = context.User.Identity.Name!;

        //Get ownership key from subject claims, first non-empty wins
        string[] subjectClaimTypes =
        [
            "http://schemas.microsoft.com/identity/claims/objectidentifier", "oid", ClaimTypes.NameIdentifier, "sub"
        ];
        foreach (var claimType in subjectClaimTypes)
        {
            var claim = context.User.FindFirst(c => string.Equals(c.Type, claimType, StringComparison.OrdinalIgnoreCase));
            if (claim != null && !string.IsNullOrWhiteSpace(claim.Value))
            {
                _ownershipKey = claim.Value;
                break;
            }
        }

        // Fallback for a machine-to-machine caller that carries no subject claim at all (DRK-1277 §11/§12):
        // the same "client_id" claim ICallingSystemAccessor/CallingSystemAccessor reads. Without this, a real
        // M2M create throws OwnershipRequiredException once the explicit AccountGroup.StampCreatedBy stamp is
        // gone — production still has no name claim to fall further back to until that token work lands.
        if (string.IsNullOrWhiteSpace(_ownershipKey))
        {
            var clientId = context.User.FindFirst(c => string.Equals(c.Type, "client_id", StringComparison.OrdinalIgnoreCase));
            if (clientId != null && !string.IsNullOrWhiteSpace(clientId.Value))
            {
                _ownershipKey = clientId.Value;
            }
        }

        //Get email
        var email = context.User.FindFirst(c =>
            c.Type.Equals("emails", StringComparison.OrdinalIgnoreCase) ||
            c.Type.Equals("email", StringComparison.OrdinalIgnoreCase));
        if (email != null)
        {
            _email = email.Value;
            if (string.IsNullOrEmpty(_userName))
            {
                _userName = _email;
            }
        }

        _initialized = true;
    }

    #endregion
}

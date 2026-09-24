namespace DKNet.Accounts.Client.Contracts;

/// <summary>One <c>field:operation:value</c> filter condition sent as a repeatable <c>filter</c> query
/// parameter — see <c>docs/generic-list-endpoint.md</c>.</summary>
/// <param name="Field">The DTO field name (PascalCase, case-insensitive).</param>
/// <param name="Operation">One of the service's list-filter operations, e.g. <c>Equal</c>, <c>Contains</c>.</param>
/// <param name="Value">The comparison value, coerced server-side to the field's CLR type.</param>
public sealed record ListFilter(string Field, string Operation, string Value);

/// <summary>The shared filter/search/order/paging argument shape every generated list route accepts.</summary>
public abstract record ListQuery
{
    /// <summary>ANDed together; the query string carries one repeated <c>filter</c> parameter per entry.</summary>
    public IReadOnlyList<ListFilter> Filters { get; init; } = [];

    /// <summary>Free-text OR search across the DTO's string fields. Minimum 2 characters.</summary>
    public string? Search { get; init; }

    /// <summary>A single DTO field name to sort by.</summary>
    public string? OrderBy { get; init; }

    /// <summary>Reverses the <see cref="OrderBy"/> direction.</summary>
    public bool Desc { get; init; }

    /// <summary>1-based page number.</summary>
    public int? PageNumber { get; init; }

    /// <summary>Page size, clamped server-side to the host's configured maximum.</summary>
    public int? PageSize { get; init; }

    /// <summary>Inclusive lower bound on the record's last-active moment.</summary>
    public DateTimeOffset? FromDate { get; init; }

    /// <summary>Inclusive upper bound on the record's last-active moment.</summary>
    public DateTimeOffset? ToDate { get; init; }
}

/// <summary>Query arguments for <c>GET /v1/accounts</c>.</summary>
public sealed record AccountsListQuery : ListQuery;

/// <summary>Query arguments for <c>GET /v1/account-groups</c>.</summary>
public sealed record AccountGroupsListQuery : ListQuery;

/// <summary>Query arguments for <c>GET /v1/currencies</c>.</summary>
public sealed record CurrenciesListQuery : ListQuery;

/// <summary>Query arguments for <c>GET /v1/accounts/{id}/statement</c> — deliberately its own shape, not a
/// <see cref="ListQuery"/> (the service keeps the two surfaces different).</summary>
public sealed record StatementQuery
{
    public DateOnly? From { get; init; }

    public DateOnly? To { get; init; }

    public int? PageIndex { get; init; }

    public int? PageSize { get; init; }
}

/// <summary>Query arguments for <c>GET /v1/postings</c> — deliberately its own shape (not a
/// <see cref="ListQuery"/>): the effective-date window is required, unlike the shared surface's optional
/// activity window, and narrowing by account/direction/category/status rides beside it.</summary>
public sealed record PostingsListQuery
{
    public DateOnly? From { get; init; }

    public DateOnly? To { get; init; }

    public Guid? AccountId { get; init; }

    public string? Direction { get; init; }

    public string? Category { get; init; }

    public string? Status { get; init; }

    public string? Search { get; init; }

    public string? OrderBy { get; init; }

    public bool Desc { get; init; }

    public int? PageNumber { get; init; }

    public int? PageSize { get; init; }
}

/// <summary>Mirrors the service's <c>PagedResponse&lt;TResult&gt;</c> envelope.</summary>
public sealed record PagedResult<TResult>
{
    public IReadOnlyList<TResult> Items { get; init; } = [];

    public int PageCount { get; init; }

    public int PageNumber { get; init; }

    public int PageSize { get; init; }

    public int TotalItemCount { get; init; }

    public bool HasNextPage { get; init; }

    public bool HasPreviousPage { get; init; }
}

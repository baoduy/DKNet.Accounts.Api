namespace DKNet.Accounts.AppServices.Transfers.V1.Queries;

/// <summary>
/// The transfers of one account (DRK-2300 §5): every transfer the account is the source, destination or fee
/// account of, inside a UTC recorded-date window of at most 1 year, searchable, sortable and paged. Build adds the
/// validator and the handler; this stage only carries the signature the acceptance tests compile against.
/// </summary>
public sealed record ListAccountTransfersQuery : Fluents.Queries.IWitPageResponse<TransferRowDto>
{
    public Guid AccountId { get; init; }

    public DateOnly? From { get; init; }

    public DateOnly? To { get; init; }

    public string? Search { get; init; }

    public string? OrderBy { get; init; }

    public bool Desc { get; init; }

    public int? PageNumber { get; init; }

    public int? PageSize { get; init; }
}

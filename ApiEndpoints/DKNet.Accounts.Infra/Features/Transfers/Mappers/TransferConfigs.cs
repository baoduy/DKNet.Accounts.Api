using DKNet.Accounts.Domains.Features.Transfers.Entities;

namespace DKNet.Accounts.Infra.Features.Transfers.Mappers;

internal sealed class TransferConfigs : DefaultEntityTypeConfiguration<Transfer>
{
    #region Methods

    public override void Configure(EntityTypeBuilder<Transfer> builder)
    {
        base.Configure(builder);

        // Cross-aggregate references by id only (DKNET-AGG-004) — no navigation property, no FK constraint.
        builder.HasIndex(t => t.SourceAccountId);
        builder.HasIndex(t => t.DestinationAccountId);

        // One transfer per (CallingSystem, IdempotencyKey): a lost race on a first use answers the same 409 as
        // the handler's own pre-check (LedgerErrorResponseOptions.UniqueIndexCodes).
        builder.HasIndex(t => new { t.CallingSystem, t.IdempotencyKey }).IsUnique();

        builder.Property(t => t.Amount).HasPrecision(18, 6);
        builder.Property(t => t.Fee).HasPrecision(18, 6);
        builder.Property(t => t.ConvertedAmount).HasPrecision(18, 6);
        builder.Property(t => t.ExchangeRate).HasPrecision(18, 8).IsRequired(false);

        builder.Property(t => t.SourceCurrency).HasMaxLength(10).IsRequired();
        builder.Property(t => t.DestinationCurrency).HasMaxLength(10).IsRequired();
        builder.Property(t => t.FeeAccountId).IsRequired(false);
        builder.Property(t => t.CallingSystem).HasMaxLength(100).IsRequired();
        builder.Property(t => t.IdempotencyKey).HasMaxLength(255).IsRequired();

        builder.ToTable("Transfers", DomainSchemas.Accounts);
    }

    #endregion
}

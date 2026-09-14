using DKNet.Accounts.Domains.Features.Postings.Entities;
using DKNet.Accounts.Infra.Extensions;

namespace DKNet.Accounts.Infra.Features.Postings.Mappers;

internal sealed class PostingConfigs : DefaultEntityTypeConfiguration<Posting>
{
    #region Methods

    public override void Configure(EntityTypeBuilder<Posting> builder)
    {
        base.Configure(builder);

        // Cross-aggregate references by id only (DKNET-AGG-004) — no navigation property, no FK constraint.
        builder.HasIndex(p => p.AccountId);

        builder.Property(p => p.PostingNumber).HasMaxLength(32).IsRequired();
        builder.HasIndex(p => p.PostingNumber).IsUnique();

        // Gapless, unique per account, recording order — the invariant the whole stream depends on.
        builder.HasIndex(p => new { p.AccountId, p.StreamPosition }).IsUnique();

        // Statement reads bound by effective date and order by stream position within an account.
        builder.HasIndex(p => new { p.AccountId, p.EffectiveDate, p.StreamPosition });

        // Idempotency is scoped to (CallingSystem, IdempotencyKey); a null key never collides with another
        // null (both providers treat NULL as distinct from every other value, including other NULLs).
        builder.HasIndex(p => new { p.CallingSystem, p.IdempotencyKey }).IsUnique();

        builder.Property(p => p.Direction).HasConversion<string>();
        builder.Property(p => p.Category).HasConversion<string>();
        builder.Property(p => p.Status).HasConversion<string>();

        builder.Property(p => p.Currency).HasMaxLength(3).IsRequired();
        builder.Property(p => p.Amount).HasPrecision(18, 2);
        builder.Property(p => p.SignedValue).HasPrecision(18, 2);
        builder.Property(p => p.BalanceAfter).HasPrecision(18, 2);

        builder.Property(p => p.CounterpartyReference).HasMaxLength(200).IsRequired(false);
        builder.Property(p => p.CallingSystem).HasMaxLength(100).IsRequired();
        builder.Property(p => p.IdempotencyKey).HasMaxLength(255).IsRequired(false);
        builder.Property(p => p.IdempotencySignature).HasMaxLength(64).IsRequired(false);
        builder.Property(p => p.ExternalReference).HasMaxLength(200).IsRequired(false);
        builder.Property(p => p.Description).HasMaxLength(500).IsRequired(false);

        builder.Property(p => p.Metadata)
            .HasConversion(MetadataConversion.Converter)
            .Metadata.SetValueComparer(MetadataConversion.Comparer);
        builder.Property(p => p.Metadata).HasMaxLength(4000);

        builder.ToTable("Postings", DomainSchemas.Profile);
    }

    #endregion
}

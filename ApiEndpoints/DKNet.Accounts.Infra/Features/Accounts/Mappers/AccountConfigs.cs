using DKNet.Accounts.Domains.Features.Accounts.Entities;
using DKNet.Accounts.Infra.Extensions;

namespace DKNet.Accounts.Infra.Features.Accounts.Mappers;

internal sealed class AccountConfigs : DefaultEntityTypeConfiguration<Account>
{
    #region Methods

    public override void Configure(EntityTypeBuilder<Account> builder)
    {
        base.Configure(builder);

        builder.Property(a => a.AccountNumber).HasMaxLength(32).IsRequired();
        builder.HasIndex(a => a.AccountNumber).IsUnique();

        // Cross-aggregate reference by id only (DKNET-AGG-004) — no navigation property, no FK constraint.
        builder.HasIndex(a => a.GroupId);

        builder.Property(a => a.Name).HasMaxLength(200).IsRequired();
        builder.Property(a => a.CurrencyCode).HasMaxLength(10).IsRequired();
        builder.Property(a => a.ExternalReference).HasMaxLength(200).IsRequired(false);

        builder.Property(a => a.Classification).HasConversion<string>();
        builder.Property(a => a.Status).HasConversion<string>();

        builder.Property(a => a.Balance).HasPrecision(18, 6);
        builder.Property(a => a.HeldAmount).HasPrecision(18, 6);
        builder.Property(a => a.OverdraftLimit).HasPrecision(18, 6);
        builder.Property(a => a.MinimumBalance).HasPrecision(18, 6);

        builder.Property(a => a.Metadata)
            .HasConversion(MetadataConversion.Converter)
            .Metadata.SetValueComparer(MetadataConversion.Comparer);
        builder.Property(a => a.Metadata).HasMaxLength(4000);

        builder.Ignore(a => a.AvailableBalance);
        builder.Ignore(a => a.OpenedOn);

        builder.ToTable("Accounts", DomainSchemas.Profile);
    }

    #endregion
}

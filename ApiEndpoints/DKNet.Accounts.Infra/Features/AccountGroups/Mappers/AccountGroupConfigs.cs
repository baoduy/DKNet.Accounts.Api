using DKNet.Accounts.Domains.Features.AccountGroups.Entities;
using DKNet.Accounts.Infra.Extensions;

namespace DKNet.Accounts.Infra.Features.AccountGroups.Mappers;

internal sealed class AccountGroupConfigs : DefaultEntityTypeConfiguration<AccountGroup>
{
    #region Methods

    public override void Configure(EntityTypeBuilder<AccountGroup> builder)
    {
        base.Configure(builder);

        builder.Property(g => g.Code).HasMaxLength(50).IsRequired();
        builder.HasIndex(g => g.Code).IsUnique();

        builder.Property(g => g.Name).HasMaxLength(200).IsRequired();
        builder.Property(g => g.Description).HasMaxLength(1000).IsRequired(false);
        builder.Property(g => g.OwnerId).HasMaxLength(100).IsRequired();

        builder.Property(g => g.Type).HasConversion<string>();
        builder.Property(g => g.Status).HasConversion<string>();

        builder.HasIndex(g => g.ParentId);

        builder.Property(g => g.Metadata)
            .HasConversion(MetadataConversion.Converter)
            .Metadata.SetValueComparer(MetadataConversion.Comparer);
        builder.Property(g => g.Metadata).HasMaxLength(4000);

        builder.ToTable("AccountGroups", DomainSchemas.Profile);
    }

    #endregion
}

using DKNet.Accounts.Domains.Features.Currencies.Entities;

namespace DKNet.Accounts.Infra.Features.Currencies.Mappers;

internal sealed class CurrencyConfigs : DefaultEntityTypeConfiguration<Currency>
{
    #region Methods

    public override void Configure(EntityTypeBuilder<Currency> builder)
    {
        base.Configure(builder);

        builder.Property(c => c.Code).HasMaxLength(3).IsRequired();
        builder.HasIndex(c => c.Code).IsUnique();

        builder.Property(c => c.Name).HasMaxLength(100).IsRequired();

        builder.ToTable("Currencies", DomainSchemas.Profile);
    }

    #endregion
}

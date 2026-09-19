using DKNet.EfCore.DtoGenerator;
using DKNet.Accounts.Domains.Features.Currencies.Entities;

namespace DKNet.Accounts.AppServices.Currencies.V1;

[GenerateDto(typeof(Currency))]
public sealed partial record CurrencyDto;

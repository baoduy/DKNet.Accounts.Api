using DKNet.Accounts.AppServices.Postings.V1;
using DKNet.Accounts.AppServices.Share;
using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.App.Tests.Unit.Postings;

public class PostingRefusalMappingTests
{
    [Fact]
    public void AmountOutOfRange_MapsToItsOwnCode() =>
        PostingRefusalReason.AmountOutOfRange.ToError().Metadata[LedgerErrors.CodeKey]
            .ShouldBe(LedgerErrors.AmountOutOfRange);
}

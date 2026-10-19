using System.Globalization;

namespace DKNet.Accounts.App.BDDTests.Features.Ledger.Steps;

/// <summary>
/// Step bindings for DRK-2312 "Write responses carry each time as stored". They share the accounts, transfer
/// phrases and ledger calls of DRK-2276's steps. Times are compared as the raw JSON text, so a difference below the
/// microsecond shows in the failure message.
/// </summary>
[Scope(Feature = "Write responses carry each time as stored")]
public sealed partial class TransfersSteps
{
    private Guid _credit;

    #region Given

    [Given(@"^the host clock reads (\d{4}-\d{2}-\d{2}T[\d:.]+Z)$")]
    public void GivenTheHostClockReads(string instant) =>
        sharedHost.Clock.PinNow(DateTimeOffset.Parse(instant, CultureInfo.InvariantCulture));

    [Given(@"^PayHub posted a credit of ([\d.]+) SGD to ""([^""]+)""$")]
    public async Task GivenPayHubPostedACreditTo(decimal amount, string account) =>
        _credit = (await SucceedsAsync(
                await RecordPostingAsync(_accounts[account].Id, "Credit", amount, "SGD", NewKey()),
                $"posting a credit to {account}"))
            .GetProperty("id").GetGuid();

    #endregion

    #region When

    [When(@"^PayHub posts a credit of ([\d.]+) SGD to ""([^""]+)""$")]
    public async Task WhenPayHubPostsACreditTo(decimal amount, string account) =>
        await RecordPostingAsync(_accounts[account].Id, "Credit", amount, "SGD", NewKey());

    [When(@"^PayHub reverses that credit$")]
    public async Task WhenPayHubReversesThatCredit() =>
        await SendAsync(HttpMethod.Post, $"{PostingsPath}/{_credit}/reverse", new { reason = "Posted in error" }, NewKey());

    #endregion

    #region Then

    [Then(@"^the transfer read by its id carries the recorded time of the response$")]
    public async Task ThenTheTransferReadByItsIdCarriesTheRecordedTimeOfTheResponse()
    {
        var written = RecordedAt(_transfer);
        var read = await SucceedsAsync(await SendAsync(HttpMethod.Get, $"{TransfersPath}/{TransferId}"), "reading the transfer");
        RecordedAt(read).ShouldBe(written);
    }

    [Then(@"^each posting in the response carries the recorded time of its row in the postings list$")]
    public async Task ThenEachPostingInTheResponseCarriesTheRecordedTimeOfItsRowInThePostingsList()
    {
        // A posting and a batch answer 201, a reversal 200.
        state.Response!.IsSuccessStatusCode.ShouldBeTrue(state.ResponseBody);
        var body = Json(state.ResponseBody!);
        JsonElement[] written = body.ValueKind == JsonValueKind.Array ? [.. body.EnumerateArray()] : [body];
        written.ShouldNotBeEmpty();

        foreach (var posting in written)
        {
            var id = posting.GetProperty("id").GetGuid();
            var date = posting.GetProperty("effectiveDate").GetString();
            var page = await SucceedsAsync(
                await SendAsync(HttpMethod.Get,
                    $"{PostingsPath}?from={date}&to={date}&accountId={posting.GetProperty("accountId").GetGuid()}&pageSize=100"),
                "listing the postings");
            var row = page.GetProperty("items").EnumerateArray().Single(r => r.GetProperty("id").GetGuid() == id);
            RecordedAt(row).ShouldBe(RecordedAt(posting), $"posting {id}");
        }
    }

    #endregion

    private static string? RecordedAt(JsonElement record) => record.GetProperty("recordedAt").GetString();
}

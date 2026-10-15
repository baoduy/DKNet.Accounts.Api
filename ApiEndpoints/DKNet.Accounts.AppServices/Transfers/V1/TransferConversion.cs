namespace DKNet.Accounts.AppServices.Transfers.V1;

/// <summary>Works out what a transfer credits to its destination (DRK-2276 R6): (amount − fee) × rate, rounded
/// half away from zero to the destination currency's decimal places; amount − fee when no rate applies.</summary>
internal static class TransferConversion
{
    public static decimal Convert(decimal amount, decimal fee, decimal? rate, int destinationPlaces) =>
        Math.Round((amount - fee) * (rate ?? 1m), destinationPlaces, MidpointRounding.AwayFromZero);
}

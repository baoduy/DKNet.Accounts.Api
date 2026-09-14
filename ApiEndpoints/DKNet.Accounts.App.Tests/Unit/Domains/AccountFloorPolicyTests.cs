using DKNet.Accounts.Domains.Features.Accounts.Entities;

namespace DKNet.Accounts.App.Tests.Unit.Domains;

/// <summary>
/// R1/R2/R3 as a pure function: every combination of controls yields exactly one determinate floor, or is
/// refused outright when none exists.
/// </summary>
public class AccountFloorPolicyTests
{
    [Fact]
    public void PermittedNegativeWithNoOverdraftLimit_RequiresOverdraftLimit()
    {
        AccountFloorPolicy.RequiresOverdraftLimit(permittedToGoNegative: true, overdraftLimit: null)
            .ShouldBeTrue();
    }

    [Fact]
    public void PermittedNegativeWithOverdraftLimit_DoesNotRequireOverdraftLimit()
    {
        AccountFloorPolicy.RequiresOverdraftLimit(permittedToGoNegative: true, overdraftLimit: 20m)
            .ShouldBeFalse();
    }

    [Fact]
    public void NotPermittedNegative_NeverRequiresOverdraftLimit()
    {
        AccountFloorPolicy.RequiresOverdraftLimit(permittedToGoNegative: false, overdraftLimit: null)
            .ShouldBeFalse();
    }

    [Fact]
    public void NotPermittedNegative_FloorIsZero_WhenNoMinimumBalanceStated()
    {
        AccountFloorPolicy.Floor(permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null)
            .ShouldBe(0m);
    }

    [Fact]
    public void NotPermittedNegative_FloorIsTheMinimumBalance_WhenStricterThanZero()
    {
        AccountFloorPolicy.Floor(permittedToGoNegative: false, overdraftLimit: null, minimumBalance: 50m)
            .ShouldBe(50m);
    }

    [Fact]
    public void PermittedNegative_MinimumBalanceBindsOverALooserOverdraftLimit()
    {
        // Minimum balance 50 is stricter (less negative) than an overdraft limit of 20 would allow.
        AccountFloorPolicy.Floor(permittedToGoNegative: true, overdraftLimit: 20m, minimumBalance: 50m)
            .ShouldBe(50m);
    }

    [Fact]
    public void PermittedNegative_OverdraftLimitBindsOverALooserMinimumBalance()
    {
        AccountFloorPolicy.Floor(permittedToGoNegative: true, overdraftLimit: 20m, minimumBalance: -100m)
            .ShouldBe(-20m);
    }

    [Fact]
    public void PermittedNegative_OverdraftLimitAlone_WhenNoMinimumBalanceStated()
    {
        AccountFloorPolicy.Floor(permittedToGoNegative: true, overdraftLimit: 20m, minimumBalance: null)
            .ShouldBe(-20m);
    }

    [Fact]
    public void Floor_ThrowsForAFloorlessCombination_RatherThanReturningAWrongNumber()
    {
        Should.Throw<InvalidOperationException>(
            () => AccountFloorPolicy.Floor(permittedToGoNegative: true, overdraftLimit: null, minimumBalance: null));
    }
}

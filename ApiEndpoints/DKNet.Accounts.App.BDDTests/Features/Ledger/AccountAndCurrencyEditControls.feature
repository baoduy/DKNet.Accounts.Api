Feature: Account and currency edit controls

  DRK-1659 §5, surface 3. An account's permission to go negative becomes editable after it is opened,
  under the floor rule that already applies at open (R1/R3); a currency refuses deactivation while any
  account denominated in it still holds a balance.

  @new @integration
  Scenario: An account may be allowed to go negative after it was opened
    Given the "ACME" account is not permitted to go negative
    When treasury-ops permits it to go negative up to 500.00 SGD
    Then the account is permitted to go negative
    And its floor reads -500.00 SGD

  @new @integration
  Scenario: Permitting an account to go negative without a limit is refused
    Given the "ACME" account is not permitted to go negative and states no overdraft limit
    When treasury-ops permits it to go negative and states no overdraft limit
    Then the request is refused because an overdraft limit is required
    And the account is still not permitted to go negative

  @new @integration
  Scenario: A currency in use may not be deactivated
    Given the "ACME" account holds 100.00 SGD
    When treasury-ops deactivates the SGD currency
    Then the request is refused because accounts still hold a balance in it
    And SGD is still active

  @new @integration
  Scenario: A currency nothing is held in may be deactivated
    Given no account holds a balance in JPY
    When treasury-ops deactivates the JPY currency
    Then JPY is no longer active

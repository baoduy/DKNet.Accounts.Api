@new
Feature: Account groups and accounts

  @integration
  Scenario: PayHub opens an account inside a group
    Given PayHub has created the account group "CUST-000123" of type "Customer"
    When PayHub opens an account named "Acme Pte Ltd Operating" in "CUST-000123" in SGD as a Liability account
    Then the account is returned with a unique account number and a balance of 0.00 SGD
    And the account appears when PayHub lists the accounts of "CUST-000123"

  @integration
  Scenario: An account permitted to go negative must state how far
    Given PayHub has created the account group "CUST-000123" of type "Customer"
    When PayHub opens an account in "CUST-000123" permitted to go negative but states no overdraft limit
    Then the request is refused and no account is opened

  @integration
  Scenario: Closing an account that still holds money is refused
    Given PayHub holds an account with a balance of 25.00 SGD
    When PayHub asks to close that account
    Then the request is refused and the account remains open

  @integration
  Scenario: Closing a group whose accounts still hold money is refused
    Given the group "CUST-000123" holds an account with a balance of 25.00 SGD
    When PayHub asks to close "CUST-000123"
    Then the request is refused and the group remains open

  @integration
  Scenario: A group cannot become its own ancestor
    Given the group "CUST-000200" is a child of the group "CUST-000123"
    When PayHub asks to make "CUST-000123" a child of "CUST-000200"
    Then the request is refused and both groups keep their present parents

  @integration
  Scenario: Group balances are reported one line per currency
    Given the group "CUST-000123" holds an account with 100.00 SGD and an account with 80.00 USD
    When PayHub reads the balances of "CUST-000123"
    Then the balances show 100.00 SGD and 80.00 USD as separate lines
    And no combined total across the two currencies is reported

  @integration
  Scenario: An account reports its available balance as its current balance
    Given PayHub holds an account with a balance of 100.00 SGD
    When PayHub reads that account
    Then its available balance is 100.00 SGD and its held amount is 0.00 SGD

  @integration
  Scenario: Groups can be listed filtered by type
    Given PayHub has created two groups of type "Customer" and one of type "Suspense"
    When PayHub lists the groups of type "Suspense"
    Then only the suspense group is returned

  @integration
  Scenario: Accounts can be listed filtered by status
    Given the group "CUST-000123" holds two active accounts and one closed account
    When PayHub lists the active accounts of "CUST-000123"
    Then only the two active accounts are returned

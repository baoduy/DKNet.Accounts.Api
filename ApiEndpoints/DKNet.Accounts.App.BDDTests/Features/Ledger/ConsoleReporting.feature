Feature: Console read and edit routes — status counts and balances

  @new @integration
  Scenario: The home screen counts accounts by status
    Given the ledger holds 4 active accounts, 1 frozen account and no dormant account
    When treasury-ops asks how many accounts sit in each status
    Then the answer reads 4 active, 1 frozen, 0 dormant and 0 closed

  @new @integration
  Scenario: The home screen counts account groups by status
    Given the ledger holds 2 active groups and 1 closed group
    When treasury-ops asks how many account groups sit in each status
    Then the answer reads 2 active and 1 closed

  @new @integration
  Scenario: A status report counts only the records created inside the window
    Given 3 accounts were opened in August 2026 and 2 active accounts were opened in September 2026
    When treasury-ops asks how many accounts sit in each status, for September 2026 only
    Then the answer reads 2 active accounts
    And the August accounts are not counted

  @new @integration
  Scenario: A status report refuses a narrowing other than its date window
    When treasury-ops asks how many accounts sit in each status, narrowed by currency
    Then the request is refused because that narrowing is not offered

  @new @integration
  Scenario: The home screen reads the ledger's position by currency
    Given accounts in two different groups hold 100.00 SGD, 50.00 SGD and 20.00 USD
    When treasury-ops asks for the ledger's balances by currency
    Then the answer reads 150.00 SGD on one line and 20.00 USD on another
    And each line also states its available amount and its held amount
    And no line combines the two currencies

  @new @integration
  Scenario: Every currency line states what is available and what is held
    Given an account group holds 100.00 SGD across its accounts
    When treasury-ops asks for that group's balances by currency
    Then the SGD line states a balance of 100.00, an available amount of 100.00 and a held amount of 0.00

  @new @integration
  Scenario: An account's balance states the floor it may not fall below
    Given the "ACME" account is permitted to go negative up to 500.00 SGD
    When treasury-ops reads that account's balance
    Then the answer states a floor of -500.00 SGD

@new
Feature: Recording credits and debits

  @integration
  Scenario: A credit raises the balance by exactly the amount posted
    Given PayHub holds an active account with a balance of 0.00 SGD
    When PayHub records a credit of 100.00 SGD described as "Invoice INV-9001 settled"
    Then the account balance is 100.00 SGD
    And the posting is returned with a balance-after of 100.00 SGD and position 1 in the account's stream

  @integration
  Scenario: Repeating a posting request records it only once
    Given PayHub has recorded a credit of 100.00 SGD under its idempotency key "pay-77af"
    When PayHub repeats that request unchanged under the same key
    Then the originally recorded posting is returned
    And the account balance remains 100.00 SGD

  @integration
  Scenario: Reusing an idempotency key for different content is refused
    Given PayHub has recorded a credit of 100.00 SGD under its idempotency key "pay-77af"
    When PayHub records a credit of 250.00 SGD under the same key
    Then the request is refused and no second posting exists

  @new @integration
  Scenario: Two simultaneous postings racing on one idempotency key leave one recorded
    Given PayHub holds an active account with a balance of 0.00 SGD
    When two requests record a credit under the idempotency key "race-key-1" with different amounts at the same moment
    Then one request records the posting
    And the other is refused with 409 and the refusal carries the code "IDEMPOTENCY_KEY_CONFLICT"

  @integration
  Scenario: Two systems may use the same idempotency key independently
    Given PayHub has recorded a credit of 100.00 SGD under its idempotency key "batch-1"
    When LedgerSync records a credit of 40.00 SGD under its own key "batch-1"
    Then both postings exist

  @integration
  Scenario: A debit beyond the overdraft limit is refused
    Given PayHub holds an account with a balance of 50.00 SGD, no minimum balance and an overdraft limit of 20.00 SGD
    When PayHub records a debit of 90.00 SGD
    Then the request is refused, no posting is recorded, and the balance remains 50.00 SGD

  @integration
  Scenario: A debit within the overdraft limit is accepted
    Given PayHub holds an account with a balance of 50.00 SGD, no minimum balance and an overdraft limit of 20.00 SGD
    When PayHub records a debit of 65.00 SGD
    Then the account balance is -15.00 SGD

  @integration
  Scenario: The minimum balance binds over a looser overdraft limit
    Given PayHub holds an account with a balance of 100.00 SGD, a minimum balance of 50.00 SGD and an overdraft limit of 20.00 SGD
    When PayHub records a debit of 60.00 SGD
    Then the request is refused, no posting is recorded, and the balance remains 100.00 SGD

  @integration
  Scenario: A posting in a currency other than the account's is refused
    Given PayHub holds an SGD account
    When PayHub records a credit of 100.00 USD against it
    Then the request is refused and no posting is recorded

  @integration
  Scenario: A frozen account accepts nothing
    Given PayHub holds a frozen account
    When PayHub records a credit of 10.00 SGD against it
    Then the request is refused

  @integration
  Scenario: A dormant account still accepts a credit
    Given PayHub holds a dormant account with a balance of 100.00 SGD
    When PayHub records a credit of 10.00 SGD against it
    Then the account balance is 110.00 SGD

  @integration
  Scenario: A dormant account refuses a debit
    Given PayHub holds a dormant account with a balance of 100.00 SGD
    When PayHub records a debit of 10.00 SGD against it
    Then the request is refused and the balance remains 100.00 SGD

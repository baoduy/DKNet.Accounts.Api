@new
Feature: Correcting and reading the ledger

  @integration
  Scenario: Reversing a posting restores the previous balance
    Given PayHub recorded a credit of 100.00 SGD against an account whose balance was 0.00 SGD
    When PayHub reverses that posting
    Then a debit of 100.00 SGD appears in the account's stream
    And the account balance is 0.00 SGD
    And the original posting is marked reversed and names the posting that reversed it

  @integration
  Scenario: Reversing the same posting twice is refused
    Given PayHub has reversed a posting of 100.00 SGD
    When PayHub asks to reverse that same posting again
    Then the request is refused and the account balance is unchanged

  @integration
  Scenario: A reversal lands even when the account can no longer cover it
    Given PayHub recorded a credit of 100.00 SGD against an account not permitted to go negative
    And the account has since been debited down to 20.00 SGD
    When PayHub reverses that credit of 100.00 SGD
    Then the reversal is recorded and the account balance is -80.00 SGD

  @integration
  Scenario: A reversal against a closed account is refused until the account is reopened
    Given PayHub holds a closed account carrying a posting of 100.00 SGD
    When PayHub asks to reverse that posting
    Then the request is refused
    And after PayHub returns the account to active the same reversal is recorded

  @integration
  Scenario: A reversal that debits a dormant account is refused until the account is active
    Given PayHub holds a dormant account carrying a credit of 100.00 SGD
    When PayHub asks to reverse that credit
    Then the request is refused and the balance is unchanged
    And after PayHub returns the account to active the same reversal is recorded

  @integration
  Scenario: A batch where one movement fails records none of them
    Given PayHub holds an account with a balance of 10.00 SGD that is not permitted to go negative, and an account with a balance of 500.00 SGD
    When PayHub submits one batch debiting 400.00 SGD from the first and crediting 400.00 SGD to the second
    Then the request is refused, both balances are unchanged, and neither movement appears in either stream

  @integration
  Scenario: A transfer batch records both legs under one transaction group
    Given PayHub holds an account with a balance of 500.00 SGD and an account with a balance of 0.00 SGD
    When PayHub submits one batch debiting 400.00 SGD from the first and crediting 400.00 SGD to the second
    Then the debited account reads 100.00 SGD and the credited account reads 400.00 SGD
    And both postings share one transaction group identifier

  @integration
  Scenario: A statement returns an account's postings in stream order within a date range
    Given PayHub's account has postings dated 1 June 2026, 15 June 2026 and 30 June 2026
    When PayHub reads the statement from 10 June 2026 to 30 June 2026
    Then the postings dated 15 June 2026 and 30 June 2026 are returned in that order
    And the posting dated 1 June 2026 is not returned

  @integration
  Scenario: A backdated posting is read at the position it was recorded at
    Given PayHub's account has a posting dated 30 June 2026 recorded before a posting backdated to 15 June 2026
    When PayHub reads the statement covering all of June 2026
    Then the posting dated 30 June 2026 is returned before the posting dated 15 June 2026

  @integration
  Scenario: A posting dated in the future is refused
    Given today is 14 September 2026
    When PayHub records a credit of 10.00 SGD taking effect on 30 September 2026
    Then the request is refused and no posting is recorded

  @integration
  Scenario: Reading a statement page by page returns every posting exactly once
    Given PayHub's account holds twenty-five postings within one date range
    When PayHub reads that statement in pages of ten until a page comes back empty
    Then twenty-five postings are returned across the pages in stream order
    And no posting appears on two pages and none is missing

  @integration
  Scenario: An account balance always equals the sum of its postings
    Given PayHub has recorded credits of 100.00, 250.00 and 5.50 SGD and debits of 30.00 and 12.25 SGD against an account opened at 0.00 SGD
    When PayHub reads that account's balance
    Then the balance is 313.25 SGD

  @integration
  Scenario: Concurrent postings to one account all land and none is lost
    Given PayHub holds an account with a balance of 0.00 SGD
    When PayHub records twenty credits of 10.00 SGD at the same time
    Then the account balance is 200.00 SGD
    And the account's stream holds twenty postings at consecutive positions

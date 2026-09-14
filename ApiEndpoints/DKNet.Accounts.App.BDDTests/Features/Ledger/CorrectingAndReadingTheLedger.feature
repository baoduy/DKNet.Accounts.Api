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
  Scenario: A credit is reversed even when the balance no longer covers it
    Given PayHub recorded a credit of 100.00 SGD against an account that is not permitted to go negative
    And that account's balance has since fallen to 20.00 SGD
    When PayHub reverses that credit
    Then the reversal is recorded and the account balance is -80.00 SGD

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
    Given PayHub's account has postings dated 1 September 2026, 15 September 2026 and 30 September 2026
    When PayHub reads the statement from 10 September 2026 to 30 September 2026
    Then the postings dated 15 September 2026 and 30 September 2026 are returned in that order
    And the posting dated 1 September 2026 is not returned

  @integration
  Scenario: A statement is read across pages without loss or repetition
    Given PayHub's account holds twenty-five postings dated in September 2026
    When PayHub reads the September 2026 statement in pages of ten
    Then the three pages together return all twenty-five postings in stream order, each exactly once
    And the third page reports that the end of the stream has been reached

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

Feature: Write responses carry each time as stored

  DRK-2312. A write's 201 returns every time exactly as the database stores it, so the 201 and a later read of the
  same record compare equal at full precision. The host clock is pinned to an instant with a 7th fractional digit,
  which Postgres does not keep. A posting has no read of its own here, so it is compared with its row in the
  postings list.

  Background:
    Given PayHub holds "Alice SGD" with 500.00 SGD, and "Bob SGD" and "Fees SGD" with 0.00
    And the host clock reads 2026-10-19T05:45:39.1234569Z

  @new @integration
  Scenario: A transfer's response carries the recorded time its read returns
    When PayHub transfers 100.00 SGD from "Alice SGD" to "Bob SGD" with a 1.00 SGD fee to "Fees SGD"
    Then the transfer read by its id carries the recorded time of the response

  @new @integration
  Scenario: A posting's response carries the recorded time its list row returns
    When PayHub posts a credit of 10.00 SGD to "Bob SGD"
    Then each posting in the response carries the recorded time of its row in the postings list

  @new @integration
  Scenario: A batch's response carries the recorded time of each leg's list row
    When PayHub records a batch debiting 10.00 SGD from "Alice SGD" and crediting 10.00 SGD to "Bob SGD"
    Then each posting in the response carries the recorded time of its row in the postings list

  @new @integration
  Scenario: A reversal's response carries the recorded time its list row returns
    Given PayHub posted a credit of 10.00 SGD to "Bob SGD"
    When PayHub reverses that credit
    Then each posting in the response carries the recorded time of its row in the postings list

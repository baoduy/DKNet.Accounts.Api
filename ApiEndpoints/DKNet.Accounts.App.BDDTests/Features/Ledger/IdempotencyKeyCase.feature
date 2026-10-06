Feature: The idempotency key is compared without regard to case

  DRK-2120 surface B (DRK-2127): record, record batch and reverse lowercase the idempotency key, independent of
  the server's language, before they look up earlier postings and before they store it. Integration scenarios
  run against PostgreSQL; the unit scenario needs no database.

  @new @integration
  Scenario Outline: A key that differs only by case replays the first request
    Given "treasury-ops" <request> with idempotency key "ABC"
    When "treasury-ops" repeats that request with idempotency key "abc"
    Then the second call is a replay of the first
    And only one result is recorded

    Examples:
      | request                                               |
      | recorded a 100.00 SGD credit on account 10001         |
      | recorded a batch of 2 postings on account 10001       |
      | reversed posting 20001 for "duplicate charge"         |

  @new @unit
  Scenario: The key is lowercased the same way on every server
    Given the server's language is Turkish
    When "treasury-ops" records a posting with idempotency key "TITLE"
    Then the stored key is "title"

  @new @integration
  Scenario: A different request under a key that differs only by case is refused
    Given "treasury-ops" recorded a 100.00 SGD credit on account 10001 with idempotency key "ABC"
    When "treasury-ops" records a 250.00 SGD credit on account 10001 with idempotency key "abc"
    Then the call is refused with 409 "IDEMPOTENCY_KEY_CONFLICT"
    And no new posting is recorded

  @new @integration
  Scenario: The posting shows the lowercased key
    Given "treasury-ops" records a 100.00 SGD credit on account 10001 with idempotency key "Pay-ABC-01"
    When "treasury-ops" reads that posting
    Then the posting shows idempotency key "pay-abc-01"

  @existing @integration
  Scenario: The same key from 2 calling systems records 2 postings
    Given "treasury-ops" recorded a 100.00 SGD credit on account 10001 with idempotency key "abc"
    When "payroll" records a 100.00 SGD credit on account 10001 with idempotency key "ABC"
    Then account 10001 holds 2 postings

  @existing @integration
  Scenario: Postings that carry no idempotency key never conflict
    Given "treasury-ops" recorded a batch of 2 postings on account 10001 with idempotency key "batch-1"
    When "treasury-ops" records a batch of 2 postings on account 10001 with idempotency key "batch-2"
    Then account 10001 holds 4 postings

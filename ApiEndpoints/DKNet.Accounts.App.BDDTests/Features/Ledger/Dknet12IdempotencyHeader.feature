Feature: Release 12.0.0 and the declared idempotency-key header

  @integration @guard
  Scenario: Recording a posting still carries the caller's idempotency key
    Given the account "Operating SGD" is open with a balance of 0.00 SGD
    And "treasury-ops" is signed in and holds the postings-write permission
    When "treasury-ops" records a posting against "Operating SGD" with a fresh idempotency key
    Then the posting is recorded
    And the recorded posting carries the idempotency key it was sent

  @integration @guard
  Scenario: Recording a batch still carries the caller's idempotency key
    Given the accounts "Operating SGD" and "Fees SGD" are open, holding 100.00 SGD and 0.00 SGD
    And "treasury-ops" is signed in and holds the postings-write permission
    When "treasury-ops" records a batch moving 25.00 SGD from "Operating SGD" to "Fees SGD" with a fresh batch idempotency key
    Then both movements are recorded together
    And the first leg of the batch carries the idempotency key it was sent

  @integration @guard
  Scenario: A repeated batch idempotency key with different content is still refused as a conflict
    Given a batch moving 10.00 SGD from "Operating SGD" to "Fees SGD" was recorded with the idempotency key "batch-k-1"
    And "treasury-ops" is signed in and holds the postings-write permission
    When "treasury-ops" sends a different batch moving 20.00 SGD from "Operating SGD" to "Fees SGD" with the idempotency key "batch-k-1"
    Then the response status is 409
    And one error in the response carries the code "IDEMPOTENCY_KEY_CONFLICT"

  @integration @guard
  Scenario: A body-supplied idempotency key is ignored
    Given the account "Operating SGD" is open with a balance of 0.00 SGD
    And "treasury-ops" is signed in and holds the postings-write permission
    When "treasury-ops" records a posting against "Operating SGD" carrying the idempotency key "body-only-key" only in the body
    And "treasury-ops" records the same posting payload against "Operating SGD" carrying the idempotency key "body-only-key" only in the body again
    Then both requests are recorded as separate postings

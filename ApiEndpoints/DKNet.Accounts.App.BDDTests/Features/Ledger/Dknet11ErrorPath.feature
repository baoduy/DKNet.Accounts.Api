Feature: DKNet 11.0.0 adoption and one failure path in the accounts service

  @new @integration
  Scenario: A business-rule refusal carries its code inside the error list
    Given the account group "Treasury" holds an account with a balance of 100.00 SGD
    And "treasury-ops" is signed in and holds the accounts-write permission
    When "treasury-ops" sends the close request for "Treasury"
    Then the response status is 422
    And one error in the response carries the code "GROUP_HOLDS_BALANCE"
    And the response carries no "detail" member

  @new @integration
  Scenario: A repeated idempotency key with different content is still refused as a conflict
    Given the posting "p-1" was recorded with the idempotency key "k-77"
    And "treasury-ops" is signed in and holds the postings-write permission
    When "treasury-ops" records a different posting with the idempotency key "k-77"
    Then the response status is 409
    And one error in the response carries the code "IDEMPOTENCY_KEY_CONFLICT"

  @new @integration
  Scenario: Refused input with no stable code takes the same body shape
    Given "treasury-ops" is signed in and holds the accounts-write permission
    When "treasury-ops" sends a create request for an account group with no name
    Then the response status is 400
    And the response carries one list of errors, each with its message
    And no error in that list carries one of the service's documented refusal codes
    And the response carries no "detail" member

  @integration @guard
  Scenario: Accounts publish no delete route
    Given the account "Operating SGD" exists
    And "treasury-ops" is signed in and holds the accounts-write permission
    When "treasury-ops" sends a delete request for "Operating SGD"
    Then the request is refused as not found
    And the account "Operating SGD" still exists

  @integration @guard
  Scenario Outline: The hand-written account routes keep working at their current addresses
    Given the account "Operating SGD" is open in the group "Treasury" with a balance of 100.00 SGD
    And the account "Spare SGD" is open in the group "Treasury" with a balance of 0.00 SGD
    And "treasury-ops" is signed in and holds every accounts permission and the postings-read permission
    When "treasury-ops" sends <request> to the address published today
    Then the request succeeds
    And <result>

    Examples:
      | request                                                   | result                                                |
      | the request to open a third account in "Treasury"         | the third account is open with a balance of 0.00 SGD  |
      | the request to close "Spare SGD"                           | "Spare SGD" is closed                                 |
      | the request to set an overdraft limit on "Operating SGD"   | "Operating SGD" carries that overdraft limit           |
      | the request to read the balance of "Operating SGD"         | the balance read is 100.00 SGD                        |
      | the request to read the statement of "Operating SGD"       | a paged statement in stream order is returned          |

  @new @integration
  Scenario: Closing an account that still holds a balance is still refused
    Given the account "Operating SGD" is open with a balance of 100.00 SGD
    And "treasury-ops" is signed in and holds the accounts-write permission
    When "treasury-ops" sends the request to close "Operating SGD"
    Then the response status is 422
    And one error in the response carries the code "ACCOUNT_HOLDS_BALANCE"
    And the account "Operating SGD" stays open

  @integration @guard
  Scenario: Reading a group's totals per currency keeps working at its current address
    Given the account group "Treasury" holds two SGD accounts with balances of 40.00 and 60.00
    And "treasury-ops" is signed in and holds the accounts-read permission
    When "treasury-ops" reads the totals of "Treasury"
    Then one line is returned for SGD with a total of 100.00

  @integration @guard
  Scenario: Recording a posting still works at its current address
    Given the account "Operating SGD" is open with a balance of 0.00 SGD
    And "treasury-ops" is signed in and holds the postings-write permission
    When "treasury-ops" records a credit of 50.00 SGD with a fresh idempotency key
    Then the posting is recorded
    And the balance of "Operating SGD" is 50.00 SGD

  @integration @guard
  Scenario: Recording a batch still works at its current address
    Given the accounts "Operating SGD" and "Fees SGD" are open, holding 100.00 SGD and 0.00 SGD
    And "treasury-ops" is signed in and holds the postings-write permission
    When "treasury-ops" records a batch moving 25.00 SGD from "Operating SGD" to "Fees SGD" with a fresh idempotency key
    Then both movements are recorded together
    And the balance of "Fees SGD" is 25.00 SGD

  @integration @guard
  Scenario: Reversing a posting still works at its current address
    Given the accounts "Operating SGD" and "Fees SGD" are open, holding 100.00 SGD and 0.00 SGD
    And a posting moved 25.00 SGD from "Operating SGD" to "Fees SGD"
    And "treasury-ops" is signed in and holds the postings-reverse permission
    When "treasury-ops" reverses the movement recorded against "Fees SGD"
    Then an opposing posting is recorded
    And the balance of "Fees SGD" is 0.00 SGD

  @integration @guard
  Scenario: An unknown account group is still not found
    Given no account group with the id "3f1b7c88-1d0e-4a55-9c2a-6e1f0b4d9a71" exists
    And "treasury-ops" is signed in and holds the accounts-read permission
    When "treasury-ops" reads that account group
    Then the response status is 404
    And the response carries no body

  @integration @guard
  Scenario: A caller without the write permission is still refused
    Given the account group "Treasury" is closed
    And "treasury-ops" is signed in and holds only the accounts-read permission
    When "treasury-ops" sends the activate request for "Treasury"
    Then the request is refused as not permitted
    And the response carries no body
    And the account group "Treasury" stays closed

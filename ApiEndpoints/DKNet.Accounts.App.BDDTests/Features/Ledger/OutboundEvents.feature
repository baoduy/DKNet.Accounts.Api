Feature: Ledger changes are published as events

  DRK-1773 §5. Every saved create, update or delete of a currency, account group, account or posting lands on
  the outbound queue as a { type, payload } event, stored in the same database save and delivered at least
  once. These scenarios run against a real RabbitMQ broker and a real Postgres database, each on a host and a
  queue of their own. The two @unit scenarios of §5 ("A redelivered event keeps its message id" and
  "Configuration picks the transport and queue") live in DKNet.Accounts.App.Tests/Unit.

  @new @integration
  Scenario Outline: Each saved change publishes its event
    Given the message bus is on
    When treasury-ops <change>
    Then 1 <event> event for that record is on the outbound queue

    Examples:
      | change                                                  | event                 |
      | registers currency "SGD" with 2 decimal places          | currency-created      |
      | deactivates currency "SGD"                              | currency-updated      |
      | creates account group "OPSSG"                           | account-group-created |
      | closes account group "OPSSG"                            | account-group-updated |
      | deletes the empty account group "OPTMP"                 | account-group-deleted |
      | opens account "Ops float" in SGD                        | account-created       |
      | renames account "Ops float" to "Ops float SG"           | account-updated       |
      | sets the overdraft limit of "Ops float" to 500.00 SGD   | account-updated       |
      | records a credit of 100.00 SGD on "Ops float"           | posting-created       |

  @new @integration
  Scenario: A posting does not publish an account update
    Given account "Ops float" holds 100.00 SGD
    When treasury-ops records a credit of 50.00 SGD on "Ops float"
    Then 1 posting-created event is on the outbound queue
    And no account-updated event is on the outbound queue

  @new @integration
  Scenario: A reversal publishes the reversing posting and the updated original
    Given treasury-ops recorded a credit of 100.00 SGD on "Ops float"
    When treasury-ops reverses that credit with reason "Duplicate payment"
    Then 1 posting-created event for the reversing debit is on the outbound queue
    And 1 posting-updated event shows the original credit as reversed

  @new @integration
  Scenario: A batch publishes one event per posting
    When treasury-ops records a batch of 3 postings on "Ops float"
    Then 3 posting-created events are on the outbound queue

  @new @integration
  Scenario: A refused write publishes nothing
    Given account "Ops float" is closed
    When treasury-ops records a debit of 10.00 SGD on "Ops float"
    Then the posting is refused with "ACCOUNT_CLOSED"
    And no event is on the outbound queue

  @new @integration
  Scenario: A bus outage does not fail the write
    Given the message bus is unreachable
    When treasury-ops registers currency "MYR" with 2 decimal places
    Then the registration succeeds

  @new @integration
  Scenario: A waiting event is sent after the bus returns, even across a restart
    Given a currency-created event for "MYR" is waiting because the bus was unreachable
    And the service has restarted
    When the message bus becomes reachable again
    Then 1 currency-created event for "MYR" is on the outbound queue

  @new @integration
  Scenario: A posting payload carries public fields only
    When treasury-ops records a credit of 100.00 SGD on "Ops float" with idempotency key "pay-2026-0001"
    Then the posting-created event carries amount 100.00, currency "SGD" and idempotency key "pay-2026-0001"
    And the event does not carry the posting's idempotency signature

  @new @integration
  Scenario: A delete event carries the group as it was
    Given account group "OPTMP" is empty and active
    When treasury-ops deletes account group "OPTMP"
    Then the account-group-deleted event carries code "OPTMP" and status active

  @new @integration
  Scenario: With the bus off, nothing is stored or sent
    Given the message bus is off
    When treasury-ops registers currency "THB" with 2 decimal places
    Then the registration succeeds as it does today
    And no event is stored or sent

  @new @integration
  Scenario Outline: A developer sees events in the docker compose setup
    Given the docker compose setup is started on an <machine> machine
    When treasury-ops registers currency "SGD" with 2 decimal places
    Then 1 currency-created event for "SGD" is on the local RabbitMQ outbound queue

    Examples:
      | machine |
      | arm64   |
      | amd64   |

Feature: Transfer money between 2 accounts

  DRK-2276 §5 (spec revision 21). Every scenario below drives POST /v1/transfers and GET /v1/transfers/{id} over
  HTTP on the shared Postgres host; the events scenario moves to a host of its own with the message bus on
  (OutboundApiFactory) and opens the Background's accounts there. Three scenarios of §5 live in
  DKNet.Accounts.App.Tests instead, because they need the internals of AppServices or the client package:
  - "The converted amount is rounded half away from zero to the destination currency" (@unit):
    Unit/Transfers/TransferConversionTests.cs
  - "Every route has 1 client method and declares its permission":
    Client/RouteParityTests.cs and Architecture/RouteScopeCoverageTests.cs
  - "The .NET client records and reads a transfer": Client/TransferClientTests.cs

  Background:
    Given PayHub holds these Liability accounts that may not go negative:
      | account   | balance    |
      | Alice SGD | 500.00 SGD |
      | Bob USD   | 0.00 USD   |
      | Carol SGD | 0.00 SGD   |
      | Fees SGD  | 0.00 SGD   |
      | Fees USD  | 0.00 USD   |

  @new @integration
  Scenario: A cross-currency transfer takes the fee out of the amount
    When PayHub transfers 100.00 SGD from "Alice SGD" to "Bob USD" at a rate of 0.74 with a 2.00 SGD fee to "Fees SGD"
    Then "Alice SGD" reads 400.00 SGD, "Bob USD" reads 72.52 USD and "Fees SGD" reads 2.00 SGD
    And PayHub gets back the new transfer with its 4 postings

  @new @integration
  Scenario: Accounts of any type may take part
    Given "Cash at bank SGD" is an Asset account holding 0.00 SGD with a floor of 0
    When PayHub transfers 30.00 SGD from "Cash at bank SGD" to "Carol SGD" with a 0.00 SGD fee
    Then "Cash at bank SGD" reads 30.00 SGD and "Carol SGD" reads 30.00 SGD

  @new @integration
  Scenario: A transfer can be read back with its postings
    Given PayHub transferred 100.00 SGD from "Alice SGD" to "Bob USD" at a rate of 0.74 with a 2.00 SGD fee to "Fees SGD"
    When PayHub reads that transfer by its id
    Then the transfer shows an amount of 100.00 SGD, a rate of 0.74, a fee of 2.00 SGD and a converted amount of 72.52 USD
    And it holds these postings, each carrying the transfer's id as its transaction group:
      | account   | direction | amount    | category |
      | Alice SGD | Debit     | 98.00 SGD | Transfer |
      | Bob USD   | Credit    | 72.52 USD | Transfer |
      | Alice SGD | Debit     | 2.00 SGD  | Fee      |
      | Fees SGD  | Credit    | 2.00 SGD  | Fee      |

  @new @integration
  Scenario: A same-currency transfer with no fee records 2 postings
    When PayHub transfers 50.00 SGD from "Alice SGD" to "Carol SGD" with a 0.00 SGD fee and no rate
    Then "Alice SGD" reads 450.00 SGD and "Carol SGD" reads 50.00 SGD
    And the transfer holds 2 postings and no fee posting

  @new @integration
  Scenario: The fee account may be the destination
    When PayHub transfers 100.00 SGD from "Alice SGD" to "Carol SGD" with a 2.00 SGD fee to "Carol SGD"
    Then "Alice SGD" reads 400.00 SGD and "Carol SGD" reads 100.00 SGD

  @new @integration
  Scenario: A converted amount that rounds to 0 is refused
    Given PayHub also holds "Minh VND" with 100 VND and "Eva EUR" with 0.00 EUR
    When PayHub transfers 1 VND from "Minh VND" to "Eva EUR" at a rate of 0.00003445 with a 0 VND fee
    Then the transfer is refused with CONVERTED_AMOUNT_TOO_SMALL
    And "Minh VND" still reads 100 VND and "Eva EUR" still reads 0.00 EUR

  @new @integration
  Scenario Outline: The rate rules are enforced
    When PayHub transfers 100.00 SGD from "Alice SGD" to "<destination>" with a 0.00 SGD fee and <rate>
    Then the transfer is refused with <code> on the rate, no balance changes and no transfer is recorded

    Examples:
      | destination | rate                     | code                      |
      | Carol SGD   | a rate of 1              | EXCHANGE_RATE_NOT_ALLOWED |
      | Bob USD     | no rate                  | EXCHANGE_RATE_REQUIRED    |
      | Bob USD     | a rate of 0              | INVALID_EXCHANGE_RATE     |
      | Bob USD     | a rate of 0.743715001    | INVALID_EXCHANGE_RATE     |
      | Bob USD     | a rate of 10000000000    | INVALID_EXCHANGE_RATE     |

  @new @integration
  Scenario Outline: The fee rules are enforced
    When PayHub transfers 100.00 SGD from "Alice SGD" to "Bob USD" at a rate of 0.74 with <fee> and <fee account>
    Then the transfer is refused with <code> on the <field>, no balance changes and no transfer is recorded

    Examples:
      | fee              | fee account           | code                 | field       |
      | a 100.00 SGD fee | "Fees SGD"            | INVALID_FEE          | fee         |
      | a -1.00 SGD fee  | "Fees SGD"            | INVALID_FEE          | fee         |
      | a 2.005 SGD fee  | "Fees SGD"            | INVALID_FEE          | fee         |
      | a 2.00 SGD fee   | no fee account        | FEE_ACCOUNT_REQUIRED | fee account |
      | a 2.00 SGD fee   | "Fees USD"            | INVALID_FEE_ACCOUNT  | fee account |
      | a 2.00 SGD fee   | "Alice SGD"           | INVALID_FEE_ACCOUNT  | fee account |
      | a 0.00 SGD fee   | "Fees SGD"            | INVALID_FEE_ACCOUNT  | fee account |
      | a 2.00 SGD fee   | an unknown account    | not found (404)      | fee account |

  @new @integration
  Scenario Outline: The accounts, currencies and amount must fit the transfer
    When PayHub transfers 100.00 SGD from "Alice SGD" to "Bob USD" at a rate of 0.74 with a 0.00 SGD fee, but <change>
    Then the transfer is refused with <refusal>, no balance changes and no transfer is recorded

    Examples:
      | change                                           | refusal                |
      | the destination is "Alice SGD" in SGD, no rate   | SAME_ACCOUNT_TRANSFER  |
      | the source currency is given as USD              | CURRENCY_MISMATCH      |
      | the destination currency is given as SGD         | CURRENCY_MISMATCH      |
      | the source currency is given as XYZ              | UNSUPPORTED_CURRENCY   |
      | the amount is 100.005 SGD                        | INVALID_POSTING_AMOUNT |
      | the amount is 0.00 SGD                           | INVALID_POSTING_AMOUNT |
      | the destination is "Gold XAU", whose XAU is inactive | UNSUPPORTED_CURRENCY |
      | the source account does not exist                | not found (404)        |
      | the destination account does not exist           | not found (404)        |

  @new @integration
  Scenario Outline: A required input is missing
    When PayHub sends a transfer of 50.00 SGD from "Alice SGD" to "Carol SGD" that leaves out <input>
    Then the request is refused as invalid (400), naming <input>, no balance changes and no transfer is recorded

    Examples:
      | input                    |
      | the source account       |
      | the destination account  |
      | the amount               |
      | the source currency      |
      | the destination currency |
      | the fee                  |
      | the idempotency key      |

  @new @integration
  Scenario Outline: Every account's own posting rules apply, and a refusal records nothing
    Given <situation>
    When PayHub transfers <transfer>
    Then the transfer is refused with <code>, no balance changes and no transfer is recorded

    Examples:
      | situation                                                           | transfer                                                                       | code                          |
      | "Alice SGD" holds 50.00 SGD                                          | 60.00 SGD from "Alice SGD" to "Carol SGD" with a 0.00 SGD fee                  | INSUFFICIENT_FUNDS            |
      | "Alice SGD" holds 59.00 SGD                                          | 60.00 SGD from "Alice SGD" to "Carol SGD" with a 2.00 SGD fee to "Fees SGD"    | INSUFFICIENT_FUNDS            |
      | "Cash at bank SGD" is an Asset account holding 0.00 SGD, floor 0     | 20.00 SGD from "Alice SGD" to "Cash at bank SGD" with a 0.00 SGD fee           | INSUFFICIENT_FUNDS            |
      | "Alice SGD" is closed                                                | 50.00 SGD from "Alice SGD" to "Carol SGD" with a 0.00 SGD fee                  | ACCOUNT_CLOSED                |
      | "Carol SGD" is frozen                                                | 50.00 SGD from "Alice SGD" to "Carol SGD" with a 0.00 SGD fee                  | ACCOUNT_FROZEN                |
      | "Fees SGD" is closed                                                 | 50.00 SGD from "Alice SGD" to "Carol SGD" with a 2.00 SGD fee to "Fees SGD"    | ACCOUNT_CLOSED                |
      | "Alice SGD" is dormant                                               | 50.00 SGD from "Alice SGD" to "Carol SGD" with a 0.00 SGD fee                  | ACCOUNT_DORMANT_DEBIT_REFUSED |

  @new @integration
  Scenario: A transfer is dated the day it is recorded
    Given today is 2026-10-20
    When PayHub transfers 50.00 SGD from "Alice SGD" to "Carol SGD" with a 0.00 SGD fee
    Then every posting of the transfer has the effective date 2026-10-20

  @new @integration
  Scenario: A retry with the same key returns the original transfer
    Given PayHub transferred 50.00 SGD from "Alice SGD" to "Carol SGD" with the idempotency key "tr-001"
    When PayHub sends the same transfer again with the idempotency key "tr-001"
    Then PayHub gets the original transfer back
    And "Alice SGD" reads 450.00 SGD and "Carol SGD" reads 50.00 SGD

  @new @integration
  Scenario Outline: An idempotency key is used once per calling system
    Given PayHub used the idempotency key "k-1" on <first>
    When PayHub sends <second> with the idempotency key "k-1"
    Then the request is refused with IDEMPOTENCY_KEY_CONFLICT, and nothing new is recorded

    Examples:
      | first                                                       | second                                                      |
      | a 50.00 SGD transfer from "Alice SGD" to "Carol SGD"         | a 60.00 SGD transfer from "Alice SGD" to "Carol SGD"         |
      | a single 10.00 SGD debit on "Alice SGD"                      | a 50.00 SGD transfer from "Alice SGD" to "Carol SGD"         |
      | a 50.00 SGD transfer from "Alice SGD" to "Carol SGD"         | a single 10.00 SGD debit on "Alice SGD"                      |
      | a 50.00 SGD transfer from "Alice SGD" to "Carol SGD"         | a batch moving 10.00 SGD from "Alice SGD" to "Carol SGD"     |
      | a batch moving 10.00 SGD from "Alice SGD" to "Carol SGD"     | a 50.00 SGD transfer from "Alice SGD" to "Carol SGD"         |
      | the reversal of a 10.00 SGD debit on "Alice SGD"             | a 50.00 SGD transfer from "Alice SGD" to "Carol SGD"         |
      | a 50.00 SGD transfer from "Alice SGD" to "Carol SGD"         | the reversal of a 10.00 SGD debit on "Alice SGD"             |

  @new @integration
  Scenario: Each posting of a transfer raises its own event, and the transfer raises none
    Given external events are switched on
    When PayHub transfers 100.00 SGD from "Alice SGD" to "Bob USD" at a rate of 0.74 with a 2.00 SGD fee to "Fees SGD"
    Then 4 postings.created events are sent, 1 per posting, and no other event

  @new @integration
  Scenario: Reading an unknown transfer
    When PayHub reads a transfer id that does not exist
    Then the answer is not found (404)

  @new @integration
  Scenario Outline: Transfers need the posting permissions
    Given PayHub's credential carries only <permission>
    When PayHub <action>
    Then the request is refused as forbidden (403)

    Examples:
      | permission     | action             |
      | postings.read  | records a transfer |
      | postings.write | reads a transfer   |

  @new @integration
  Scenario: The calling system comes from the credential
    When PayHub transfers 50.00 SGD from "Alice SGD" to "Carol SGD" with a 0.00 SGD fee
    Then the transfer and each of its postings name PayHub as the calling system

  @new @integration
  Scenario: Reversing 1 posting leaves the transfer record unchanged
    Given PayHub transferred 100.00 SGD from "Alice SGD" to "Bob USD" at a rate of 0.74 with a 2.00 SGD fee to "Fees SGD"
    When treasury-ops reverses the transfer's fee credit on "Fees SGD"
    Then the transfer still shows an amount of 100.00 SGD, a fee of 2.00 SGD and a converted amount of 72.52 USD
    And it still lists exactly its 4 original postings

  @new @integration
  Scenario: 2 transfers at the same time cannot overdraw the source
    Given "Alice SGD" holds 100.00 SGD
    When PayHub sends 2 transfers of 60.00 SGD from "Alice SGD" to "Carol SGD" with a 0.00 SGD fee at the same time
    Then exactly 1 transfer is recorded and the other is refused with INSUFFICIENT_FUNDS
    And "Alice SGD" reads 40.00 SGD, and its posting stream has no gaps

  @existing @integration
  Scenario: A batch still accepts amounts the caller works out itself
    When PayHub records a batch debiting 100.00 SGD from "Alice SGD" and crediting 74.00 USD to "Bob USD"
    Then "Alice SGD" reads 400.00 SGD and "Bob USD" reads 74.00 USD

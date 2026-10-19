Feature: List the transfers of one account

  DRK-2300 §5 (spec revision 16). Every scenario below drives GET /v1/accounts/{id}/transfers over HTTP on the
  shared Postgres host, with POST /v1/transfers and the existing account and posting routes for setup. A transfer
  recorded on a past date is recorded through POST /v1/transfers with the host clock pinned to that date. Three
  scenarios of §5 live in DKNet.Accounts.App.Tests instead, because they need the client package:
  - "The .NET client lists an account's transfers": Client/TransferClientTests.cs
  - "Every route still has exactly 1 client method": Client/RouteParityTests.cs
  - "The .NET client still records and reads a transfer as before": Client/TransferClientTests.cs

  Background:
    Given PayHub holds "Alice SGD" with 500.00 SGD, and "Bob SGD", "Carol SGD", "Fees SGD" and "Bob USD" with 0.00

  @new @integration
  Scenario Outline: A transfer is listed for every account on one of its sides
    Given PayHub transferred 100.00 SGD from "Alice SGD" to "Bob SGD" with a 1.00 SGD fee to "Fees SGD"
    When PayHub lists the transfers of <account>
    Then the list holds that transfer once

    Examples:
      | account     |
      | "Alice SGD" |
      | "Bob SGD"   |
      | "Fees SGD"  |

  @new @integration
  Scenario: A transfer is listed once when the account is on 2 of its sides
    Given PayHub transferred 100.00 SGD from "Alice SGD" to "Bob SGD" with a 1.00 SGD fee to "Bob SGD"
    When PayHub lists the transfers of "Bob SGD"
    Then the list holds that transfer once

  @new @integration
  Scenario: Another account's transfer is not listed
    Given PayHub transferred 50.00 SGD from "Alice SGD" to "Bob SGD" with a 0.00 SGD fee
    And PayHub transferred 20.00 SGD from "Bob SGD" to "Carol SGD" with a 0.00 SGD fee
    When PayHub lists the transfers of "Alice SGD"
    Then the list holds only the 50.00 SGD transfer

  @new @integration
  Scenario: A row shows the transfer without its postings
    Given PayHub transferred 100.00 SGD from "Alice SGD" to "Bob USD" at a rate of 0.74 with a 2.00 SGD fee to "Fees SGD"
    When PayHub lists the transfers of "Alice SGD"
    Then the row shows an amount of 100.00 SGD, a rate of 0.74, a fee of 2.00 SGD and a converted amount of 72.52 USD
    And the row shows its source, destination and fee account, its recorded time, its calling system and its idempotency key
    And the row carries no postings

  @new @integration
  Scenario: An unknown account has an empty list
    When PayHub lists the transfers of an account id the ledger does not hold
    Then PayHub gets an empty page, not an error

  @new @integration
  Scenario Outline: The date window and its defaults
    Given today is 2026-10-19 in UTC
    And "Alice SGD" sent transfers recorded on 2025-10-18, 2025-10-19, 2026-01-01 and 2026-10-19
    When PayHub lists the transfers of "Alice SGD" <window>
    Then the list holds the transfers recorded on <dates>

    Examples:
      | window                                | dates                                  |
      | with no dates                         | 2025-10-19, 2026-01-01 and 2026-10-19  |
      | from 2026-01-01 with no end           | 2026-01-01 and 2026-10-19              |
      | from 2025-10-19 to 2026-10-19         | 2025-10-19, 2026-01-01 and 2026-10-19  |
      | to 2026-01-01 with no start           | 2025-10-18, 2025-10-19 and 2026-01-01  |

  @new @integration
  Scenario: The window reads the recorded date in UTC
    Given "Alice SGD" sent a transfer recorded at 2026-01-01 23:30 UTC, which is 2026-01-02 in Singapore
    When PayHub lists the transfers of "Alice SGD" from 2025-06-01 to 2026-01-01
    Then the list holds that transfer

  @new @integration
  Scenario Outline: A window that is too long or reversed is refused
    Given today is 2026-10-19 in UTC
    When PayHub lists the transfers of "Alice SGD" <window>
    Then the request is refused with INVALID_DATE_RANGE

    Examples:
      | window                         |
      | from 2025-10-18 to 2026-10-19  |
      | from 2024-01-01 with no end    |
      | from 2026-10-19 to 2026-10-18  |

  @new @integration
  Scenario Outline: A window of exactly 1 year is accepted, leap day included
    When PayHub lists the transfers of "Alice SGD" from <from> to <to>
    Then the request <result>

    Examples:
      | from       | to         | result                             |
      | 2028-02-29 | 2029-02-28 | is accepted                        |
      | 2028-02-29 | 2029-03-01 | is refused with INVALID_DATE_RANGE |

  @new @integration
  Scenario: Search matches the idempotency key
    Given PayHub transferred 10.00 SGD from "Alice SGD" to "Bob SGD" under the idempotency key "payroll-oct-001"
    And PayHub transferred 20.00 SGD from "Alice SGD" to "Bob SGD" under the idempotency key "refund-778"
    When PayHub lists the transfers of "Alice SGD" searching for "payroll"
    Then the list holds only the 10.00 SGD transfer

  @new @integration
  Scenario: Search also matches the calling system
    Given PayHub transferred 10.00 SGD from "Alice SGD" to "Bob SGD"
    And treasury-ops transferred 20.00 SGD from "Alice SGD" to "Carol SGD"
    When PayHub lists the transfers of "Alice SGD" searching for "treasury"
    Then the list holds only the 20.00 SGD transfer

  @new @integration
  Scenario: A search term under 2 characters is refused
    When PayHub lists the transfers of "Alice SGD" searching for "a"
    Then the request is refused as invalid (400)

  @new @integration
  Scenario: The newest transfer comes first by default
    Given "Alice SGD" sent 10.00 SGD, then 30.00 SGD, then 20.00 SGD to "Bob SGD"
    When PayHub lists the transfers of "Alice SGD"
    Then the transfers come in the order 20.00, 30.00, 10.00 SGD

  @new @integration
  Scenario Outline: The list sorts by the field the caller names
    Given "Alice SGD" sent these transfers to "Bob SGD", in this order: 10.00 SGD with a 1.00 SGD fee, 30.00 SGD with a 0.00 SGD fee, 20.00 SGD with a 2.00 SGD fee
    When PayHub lists the transfers of "Alice SGD" sorted by <field> <direction>
    Then the amounts come in the order <amounts>

    Examples:
      | field            | direction  | amounts            |
      | recorded time    | ascending  | 10.00, 30.00, 20.00 |
      | amount           | ascending  | 10.00, 20.00, 30.00 |
      | amount           | descending | 30.00, 20.00, 10.00 |
      | converted amount | ascending  | 10.00, 20.00, 30.00 |
      | fee              | descending | 20.00, 10.00, 30.00 |

  @new @integration
  Scenario: An unknown sort field is refused
    When PayHub lists the transfers of "Alice SGD" sorted by "postings"
    Then the request is refused as invalid (400)

  @new @integration
  Scenario: Pages never share a transfer
    Given "Alice SGD" sent 5 transfers of 10.00 SGD each to "Bob SGD"
    When PayHub reads every page of the transfers of "Alice SGD", sorted by amount, 2 per page
    Then the 3 pages together hold each of the 5 transfers exactly once
    And page 1 reports 3 pages, 5 transfers in total, a next page and no previous page

  @new @integration
  Scenario Outline: Page number and page size fall back to safe values
    Given "Alice SGD" sent 25 transfers to "Bob SGD"
    When PayHub lists the transfers of "Alice SGD" with page number <number> and page size <size>
    Then PayHub gets page <page> holding <count> transfers, reported with a page size of <reported>

    Examples:
      | number  | size    | page | count | reported |
      | not set | not set | 1    | 20    | 20       |
      | 0       | 0       | 1    | 20    | 20       |
      | 2       | 20      | 2    | 5     | 20       |
      | 1       | 5000    | 1    | 25    | 1000     |

  @new @integration
  Scenario: A page past the end is empty
    Given "Alice SGD" sent 3 transfers to "Bob SGD"
    When PayHub lists page 5 of the transfers of "Alice SGD"
    Then PayHub gets an empty page, not an error

  @new @integration
  Scenario Outline: The list needs the posting read permission
    Given PayHub's credential carries only <permission>
    When PayHub lists the transfers of "Alice SGD"
    Then the request is refused as forbidden (403)

    Examples:
      | permission     |
      | accounts.read  |
      | postings.write |

  @existing @integration
  Scenario: Reading one transfer still shows its postings
    Given PayHub transferred 100.00 SGD from "Alice SGD" to "Bob SGD" with a 1.00 SGD fee to "Fees SGD"
    When PayHub reads that transfer by its id
    Then the transfer still holds its 4 postings

  @existing @integration
  Scenario: The statement still lists an account's postings
    Given PayHub transferred 100.00 SGD from "Alice SGD" to "Bob SGD" with a 1.00 SGD fee to "Fees SGD"
    When PayHub reads the statement of "Bob SGD"
    Then it lists the 99.00 SGD credit the transfer recorded

  @existing @integration
  Scenario: The posting list keeps its 90-day limit
    When PayHub lists postings across every account for a window of 91 days
    Then the request is refused with INVALID_DATE_RANGE

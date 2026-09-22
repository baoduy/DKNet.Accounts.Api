Feature: Console read and edit routes

  @new @integration
  Scenario: Operations staff read this quarter's postings across every account
    Given the ledger holds postings on the "ACME" and "GLOBEX" accounts
    When treasury-ops asks for all postings effective between 2026-07-01 and 2026-09-22
    Then the answer holds postings from both accounts
    And the answer states how many postings matched in total

  @new @integration
  Scenario: A posting search wider than 90 days is refused
    When treasury-ops asks for all postings effective between 2026-01-01 and 2026-09-22
    Then the request is refused as an invalid date range
    And no postings are returned

  @new @integration
  Scenario: A posting search with no date window is refused
    When treasury-ops asks for all postings with no effective-date window
    Then the request is refused as an invalid date range

  @new @integration
  Scenario Outline: The cross-account posting list narrows the same way for every dimension
    Given the ledger holds 5 postings effective on 2026-09-01: 3 credits and 2 debits
    And 2 of those 5 are on the "ACME" account, and 1 of the 5 is a fee
    And 1 of the 3 credits was reversed by 1 of the 2 debits, both on the "GLOBEX" account
    When treasury-ops asks for all postings of "<narrowing>" effective in September 2026
    Then <count> postings are returned

    Examples:
      | narrowing        | count |
      | the ACME account | 2     |
      | direction debit  | 2     |
      | category Fee     | 1     |
      | status Reversed  | 1     |

  @new @integration
  Scenario: Operations staff find a posting by the reference it carries
    Given the ledger holds 1 posting carrying the reference "INV-2045" and 4 postings carrying other references
    When treasury-ops searches the September 2026 postings for "INV-2045"
    Then only the posting carrying that reference is returned

  @new @integration
  Scenario: A posting search of one character is refused
    When treasury-ops searches the September 2026 postings for "A"
    Then the request is refused because the search term is too short
    And no postings are returned

  @new @integration
  Scenario: Operations staff read the posting list largest amount first
    Given the ledger holds postings of 10.00 SGD, 500.00 SGD and 75.00 SGD effective on 2026-09-01
    When treasury-ops asks for the September 2026 postings ordered by amount, largest first
    Then the answer reads 500.00, then 75.00, then 10.00

  @new @integration
  Scenario: Reading postings needs the posting read permission
    Given treasury-ops may read accounts but may not read postings
    When treasury-ops asks for all postings effective in September 2026
    Then the request is refused as not permitted

@new
Feature: Access control

  @integration
  Scenario: An unauthenticated caller cannot reach any account or posting
    When an unauthenticated caller asks to read an account
    Then the request is refused

  @integration
  Scenario: A caller authorised only to read cannot record a posting
    Given LedgerSync is authorised to read accounts but not to record postings
    When LedgerSync records a credit of 10.00 SGD
    Then the request is refused and no posting is recorded

  @integration
  Scenario: The recording system is taken from the credential, not the request
    Given PayHub is authenticated as itself
    When PayHub records a credit of 10.00 SGD claiming in the request body to be LedgerSync
    Then the posting is attributed to PayHub

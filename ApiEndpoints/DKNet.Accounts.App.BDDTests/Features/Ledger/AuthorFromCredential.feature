Feature: The author of a change comes from the caller's credential

  @new @integration
  Scenario Outline: The person who calls is recorded as the author of a change
    Given "priya.menon" is an authenticated person calling from the system "treasury-ops"
    And an active, empty account group "SGRTL" exists
    When "priya.menon" sends <request> for "SGRTL"
    Then the request succeeds
    And the account group's updated-by is "priya.menon"

    Examples:
      | request                 |
      | a rename to "SG Retail" |
      | a close                 |

  @new @integration
  Scenario: An author named in the request body is ignored
    Given "priya.menon" is an authenticated person calling from the system "treasury-ops"
    And an active, empty account group "SGRTL" exists
    When "priya.menon" sends a close for "SGRTL" naming "audit-bot" as the author
    Then the request succeeds
    And the account group's updated-by is "priya.menon"

  @new @integration
  Scenario: A new account group records the caller as its author
    Given "priya.menon" is an authenticated person calling from the system "treasury-ops"
    When "priya.menon" creates account group "SGWHL"
    Then the account group's created-by is "priya.menon"

  @new @integration
  Scenario: A new account records the caller as its author
    Given "priya.menon" is an authenticated person calling from the system "treasury-ops"
    When "priya.menon" opens account "SGD-0001" in group "SGRTL"
    Then the account's created-by is "priya.menon"

  @new @integration
  Scenario: Changing an account limit records the caller as the last editor
    Given "priya.menon" is an authenticated person calling from the system "treasury-ops"
    And an active account "SGD-0001" exists
    When "priya.menon" sets the overdraft limit of "SGD-0001" to 500.00 SGD
    Then the account's updated-by is "priya.menon"

  @new @integration
  Scenario: A posting by a person records the person and keeps the calling system
    Given "priya.menon" is an authenticated person calling from the system "treasury-ops"
    When "priya.menon" records a credit of 100.00 SGD to account "SGD-0001"
    Then the posting's created-by is "priya.menon"
    And the posting's calling system is "treasury-ops"

  @new @integration
  Scenario: A posting by a system with no person records the system as the author
    Given "treasury-ops" is an authenticated calling system that identifies no person
    When "treasury-ops" records a credit of 50.00 SGD to account "SGD-0001"
    Then the posting's created-by is "treasury-ops"
    And the posting's calling system is "treasury-ops"

  @new @integration
  Scenario: Reversing a posting records the caller as the last editor
    Given "priya.menon" is an authenticated person calling from the system "treasury-ops"
    And a posted credit of 100.00 SGD on account "SGD-0001" exists
    When "priya.menon" reverses that posting
    Then the original posting's updated-by is "priya.menon"

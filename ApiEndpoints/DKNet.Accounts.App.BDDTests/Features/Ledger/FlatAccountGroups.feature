Feature: Account groups are flat

  @new @integration
  Scenario: A new group is top-level
    When treasury-ops creates the account group "CUST3"
    Then the request succeeds
    And "CUST3" carries no parent

  @new @integration
  Scenario: A create request that still names a parent creates a top-level group
    Given the account group "CUST4" exists
    When treasury-ops creates the account group "CUST7" and names "CUST4" as its parent
    Then the request succeeds
    And "CUST7" carries no parent

  @new @integration
  Scenario: A change request that still names a parent leaves the group where it is
    Given the account groups "CUST2" and "CUST4" exist
    When treasury-ops changes "CUST2" and names "CUST4" as its parent
    Then the request succeeds
    And "CUST2" carries no parent

  @new @integration
  Scenario Outline: The group list cannot be read by parent
    When treasury-ops lists account groups <usage> parent
    Then the request is refused with status 400

    Examples:
      | usage       |
      | filtered by |
      | sorted by   |

  @new @integration
  Scenario: A group stored under another group becomes top-level and keeps its accounts
    Given the accounts service holds "CUST2" under "CUST1" from before this change
    And "CUST2" holds an account with a balance of 25.00 SGD
    And this change has been released
    When treasury-ops reads "CUST2"
    Then "CUST2" carries no parent
    And "CUST2" still holds that account with a balance of 25.00 SGD, and keeps its code, name and status

  @new @integration
  Scenario: A group is still closed through the change request
    Given the account group "CUST6" holds no account
    When treasury-ops closes "CUST6"
    Then the request succeeds and "CUST6" is closed

  @new @integration
  Scenario: Closing a group whose accounts still hold money is still refused
    Given the account group "CUST1" holds an account with a balance of 25.00 SGD
    When treasury-ops closes "CUST1"
    Then the request is refused with status 422 and the code "GROUP_HOLDS_BALANCE"

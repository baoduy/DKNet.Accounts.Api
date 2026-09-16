Feature: Account groups are flat

  @new @integration
  Scenario: A new group is top-level
    When treasury-ops creates the account group "CUST-000300"
    Then the request succeeds
    And "CUST-000300" carries no parent

  @new @integration
  Scenario: A create request that still names a parent creates a top-level group
    Given the account group "CUST-000400" exists
    When treasury-ops creates the account group "CUST-000700" and names "CUST-000400" as its parent
    Then the request succeeds
    And "CUST-000700" carries no parent

  @new @integration
  Scenario: A change request that still names a parent leaves the group where it is
    Given the account groups "CUST-000200" and "CUST-000400" exist
    When treasury-ops changes "CUST-000200" and names "CUST-000400" as its parent
    Then the request succeeds
    And "CUST-000200" carries no parent

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
    Given the accounts service holds "CUST-000200" under "CUST-000123" from before this change
    And "CUST-000200" holds an account with a balance of 25.00 SGD
    And this change has been released
    When treasury-ops reads "CUST-000200"
    Then "CUST-000200" carries no parent
    And "CUST-000200" still holds that account with a balance of 25.00 SGD, and keeps its code, name and status

  @new @integration
  Scenario: A group is still closed through the change request
    Given the account group "CUST-000600" holds no account
    When treasury-ops closes "CUST-000600"
    Then the request succeeds and "CUST-000600" is closed

  @new @integration
  Scenario: Closing a group whose accounts still hold money is still refused
    Given the account group "CUST-000123" holds an account with a balance of 25.00 SGD
    When treasury-ops closes "CUST-000123"
    Then the request is refused with status 422 and the code "GROUP_HOLDS_BALANCE"

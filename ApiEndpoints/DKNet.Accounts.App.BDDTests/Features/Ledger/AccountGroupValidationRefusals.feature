Feature: Account group refusals decided by validation

  @new @integration
  Scenario: A group is created when its code is free
    Given no account group holds the code "TREASURY-OPS"
    When treasury-ops creates a group with code "TREASURY-OPS" and name "Treasury Operations"
    Then the group is created
    And the response carries the code "TREASURY-OPS"

  @new @integration
  Scenario: A group is refused when its code is taken
    Given an account group holds the code "TREASURY-OPS"
    When treasury-ops creates another group with code "TREASURY-OPS"
    Then the request is refused with 422
    And the refusal carries the code "DUPLICATE_GROUP_CODE"

  @new @integration
  Scenario: Two simultaneous creates of one code leave one group
    Given no account group holds the code "TREASURY-OPS"
    When two requests create a group with code "TREASURY-OPS" at the same moment
    Then one request creates the group
    And the other is refused with 409
    And exactly one account group holds the code "TREASURY-OPS"

  @new @integration
  Scenario Outline: A group is not closed while an account still holds money
    Given the account group "TREASURY-OPS" holds an account with a balance of <balance> SGD and a held amount of <held> SGD
    When treasury-ops closes the group "TREASURY-OPS"
    Then the request is refused with 422
    And the refusal carries the code "GROUP_HOLDS_BALANCE"

    Examples:
      | balance | held  |
      | 100.00  | 0.00  |
      | 0.00    | 25.00 |

  @new @integration
  Scenario: A group is closed when every account it holds is at zero
    Given the account group "TREASURY-OPS" holds one account with a balance of 0.00 SGD and a held amount of 0.00 SGD
    When treasury-ops closes the group "TREASURY-OPS"
    Then the group is closed
    And the response carries the group "TREASURY-OPS"

  @new @integration
  Scenario: A group holding no account is closed
    Given the account group "TREASURY-OPS" holds no account
    When treasury-ops closes the group "TREASURY-OPS"
    Then the group is closed

  @new @integration
  Scenario: A closed group is reopened
    Given the account group "TREASURY-OPS" is closed
    When treasury-ops reopens the group "TREASURY-OPS"
    Then the group is active
    And the response carries the group "TREASURY-OPS"

  @new @integration
  Scenario Outline: A caller holding only the read permission cannot change a group
    Given the account group "TREASURY-OPS" is active
    And auditor-ops holds the account-group read permission and not the write permission
    When auditor-ops <action> the group "TREASURY-OPS"
    Then the request is refused with 403
    And the group "TREASURY-OPS" is still active

    Examples:
      | action  |
      | closes  |
      | reopens |

  @new @integration
  Scenario: The status-only partial update is no longer offered
    Given the account group "TREASURY-OPS" is active
    When treasury-ops sends a partial update of the group "TREASURY-OPS" carrying only the status "Closed"
    Then the request answers 405
    And the group "TREASURY-OPS" is still active

  @new @integration
  Scenario: Closing an unknown group is not found
    Given no account group is known by the identifier "11111111-1111-1111-1111-111111111111"
    When treasury-ops closes the group "11111111-1111-1111-1111-111111111111"
    Then the request answers 404

  @new @integration
  Scenario: A malformed create is still a plain input refusal
    When treasury-ops creates a group with an empty code and name "Treasury Operations"
    Then the request is refused with 400
    And the refusal carries no stable code

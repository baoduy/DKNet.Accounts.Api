Feature: Ledger operations behave identically after the CRUD plumbing is consolidated

  @new @integration
  Scenario: A new account group records the calling system as its author
    Given the calling system "treasury-ops" is authorised to write accounts
    When it creates the account group "OPS-CASH" named "Operations Cash"
    Then the group is created
    And its author is recorded as "treasury-ops"

  @new @integration
  Scenario: An author named in the request payload is ignored
    Given the calling system "treasury-ops" is authorised to write accounts
    When it creates the account group "OPS-PETTY" naming "auditor-9" as the author
    Then the group's author is recorded as "treasury-ops"

  @new @integration
  Scenario: An account group is renamed
    Given the account group "OPS-CASH" named "Operations Cash" exists
    And the calling system "treasury-ops" is authorised to write accounts
    When it renames the group to "Operations Cash Pool"
    Then the group's name is "Operations Cash Pool"

  @new @integration
  Scenario: An account is renamed
    Given the account "1000000002" of currency "SGD" exists
    And the calling system "treasury-ops" is authorised to write accounts
    When it renames that account to "Operations Reserve"
    Then the account's name is "Operations Reserve"

  @new @integration
  Scenario: An account group is read back in full
    Given the account group "OPS-CASH" of type "Internal" owned by "acme-pte-ltd" exists
    When the calling system "treasury-ops" reads that group
    Then it receives the group's code, name, type, status, owner and parent

  @existing @integration
  Scenario: Account groups can still be narrowed to one type
    Given the account groups "OPS-CASH" of type "Internal" and "OPS-FEES" of type "Settlement" exist
    When the calling system "treasury-ops" lists the account groups of type "Internal"
    Then it receives "OPS-CASH"
    And it does not receive "OPS-FEES"

  @new @integration
  Scenario: Reading an account group that does not exist is not-found
    Given no account group "OPS-GHOST" exists
    When the calling system "treasury-ops" reads that group
    Then the request is refused as not-found

  @new @integration
  Scenario: Updating an account that does not exist is not-found
    Given no account "9999999999" exists
    And the calling system "treasury-ops" is authorised to write accounts
    When it renames that account to "Operations Cash"
    Then the request is refused as not-found

  @new @integration
  Scenario: A calling system without the write scope cannot create an account group
    Given the calling system "reporting-bot" is authorised only to read accounts
    When it creates the account group "OPS-CASH" named "Operations Cash"
    Then the request is refused as forbidden

  @new @integration
  Scenario: A calling system without the reverse scope cannot reverse a posting
    Given the posting "P-0001" of 100.00 SGD exists
    And the calling system "treasury-ops" is authorised to record and read postings but not to reverse them
    When it reverses that posting
    Then the request is refused as forbidden
    And the posting is still not reversed

  @existing @integration
  Scenario: Closing a group that still holds a balance is refused
    Given the account group "OPS-CASH" holds an account with a balance of 250.00 SGD
    And the calling system "treasury-ops" is authorised to write accounts
    When it closes the group
    Then the request is refused as unprocessable
    And the refusal carries the code "GROUP_HOLDS_BALANCE"

  @new @integration
  Scenario: A group's status can still be changed once rename and metadata move off the PATCH
    Given the account group "OPS-ARCHIVE" named "Operations Archive" exists
    And the calling system "treasury-ops" is authorised to write accounts
    When it closes the group
    Then the group's status is "Closed"

  @new @integration
  Scenario: A group can still be reparented once rename and metadata move off the PATCH
    Given the account group "OPS-CHILD" named "Child Group" exists
    And the account group "OPS-PARENT2" named "Parent Group" exists
    And the calling system "treasury-ops" is authorised to write accounts
    When it reparents "OPS-CHILD" to "OPS-PARENT2"
    Then the group's parent is "OPS-PARENT2"

  @existing @integration
  Scenario: A posting recorded twice under one idempotency key is recorded once
    Given the account "1000000001" has a balance of 0.00 SGD
    And the calling system "treasury-ops" recorded a credit of 100.00 SGD under idempotency key "batch-7741"
    When it records the same credit again under idempotency key "batch-7741"
    Then it receives the original posting
    And the account's balance is 100.00 SGD

  @existing @integration
  Scenario: An account permitted to go negative must state its overdraft limit
    Given the calling system "treasury-ops" is authorised to write accounts
    When it opens an account named "Operations Cash" permitted to go negative with no overdraft limit
    Then the request is refused as unprocessable
    And the refusal carries the code "OVERDRAFT_LIMIT_REQUIRED"

  @new @integration
  Scenario: A bare listing still returns records older than the default activity window
    Given an account group created four months ago exists
    When the calling system "treasury-ops" lists the account groups with no date bounds
    Then it receives that group

  @new @integration
  Scenario Outline: Every route still requires the scope it required before
    Given the calling system "reporting-bot" holds every ledger scope except <scope>
    When it calls <route>
    Then the request is refused as forbidden

    Examples:
      | route                                 | scope               |
      | POST /v1/account-groups               | accounts.write      |
      | GET  /v1/account-groups                | accounts.read       |
      | GET  /v1/account-groups/{id}          | accounts.read       |
      | GET  /v1/accounts                      | accounts.read       |
      | GET  /v1/accounts/{id}                 | accounts.read       |
      | GET  /v1/accounts/{id}/statement      | postings.read       |
      | POST /v1/postings/{id}/reverse        | postings.reverse    |

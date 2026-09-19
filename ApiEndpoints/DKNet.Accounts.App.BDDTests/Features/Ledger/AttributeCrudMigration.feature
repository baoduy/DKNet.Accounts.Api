Feature: Ledger operations behave identically after the CRUD plumbing is consolidated

  @new @integration
  Scenario: A new account group records the calling system as its author
    Given the calling system "treasury-ops" is authorised to write accounts
    When it creates the account group "OPSCH" named "Operations Cash"
    Then the group is created
    And its author is recorded as "treasury-ops"

  @new @integration
  Scenario: An author named in the request payload is ignored
    Given the calling system "treasury-ops" is authorised to write accounts
    When it creates the account group "OPSPT" naming "auditor-9" as the author
    Then the group's author is recorded as "treasury-ops"

  @new @integration
  Scenario: An account group is renamed
    Given the account group "OPSCH" named "Operations Cash" exists
    And the calling system "treasury-ops" is authorised to write accounts
    When it renames the group to "Operations Cash Pool"
    Then the group's name is "Operations Cash Pool"

  @new @integration
  Scenario: A rename through the generated route records the acting system as its modifier
    Given the account group "OPSCH" named "Operations Cash" exists
    And the calling system "treasury-ops" is authorised to write accounts
    When it renames the group to "Operations Cash Pool"
    Then the group's modifier is recorded as "treasury-ops"

  @new @integration
  Scenario: An account is renamed
    Given the account "1000000002" of currency "SGD" exists
    And the calling system "treasury-ops" is authorised to write accounts
    When it renames that account to "Operations Reserve"
    Then the account's name is "Operations Reserve"

  @new @integration
  Scenario: An account group is read back in full
    Given the account group "OPSCH" of type "Internal" owned by "acme-pte-ltd" exists
    When the calling system "treasury-ops" reads that group
    Then it receives the group's code, name, type, status and owner

  @existing @integration
  Scenario: Account groups can still be narrowed to one type
    Given the account groups "OPSCH" of type "Internal" and "OPSFE" of type "Settlement" exist
    When the calling system "treasury-ops" lists the account groups of type "Internal"
    Then it receives "OPSCH"
    And it does not receive "OPSFE"

  @new @integration
  Scenario: Reading an account group that does not exist is not-found
    Given no account group "OPSGH" exists
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
    When it creates the account group "OPSCH" named "Operations Cash"
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
    Given the account group "OPSCH" holds an account with a balance of 250.00 SGD
    And the calling system "treasury-ops" is authorised to write accounts
    When it closes the group
    Then the request is refused as unprocessable
    And the refusal carries the code "GROUP_HOLDS_BALANCE"

  @new @integration
  Scenario: A group's status can still be changed once rename and metadata move off the PATCH
    Given the account group "OPSAR" named "Operations Archive" exists
    And the calling system "treasury-ops" is authorised to write accounts
    When it closes the group
    Then the group's status is "Closed"

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
  Scenario: An empty group is deleted
    Given the account group "TROLD" holds no account
    When treasury-ops deletes the account group "TROLD"
    Then the request succeeds with no content
    And reading "TROLD" reports that it does not exist

  @new @integration
  Scenario Outline: A group holding an account is refused
    Given the account group "TRMN" holds one <account>
    When treasury-ops deletes the account group "TRMN"
    Then the request is refused with 422 and the code "GROUP_NOT_EMPTY"
    And the account group "TRMN" still exists
    And that account still holds the same group, status and balance

    Examples:
      | account                          |
      | open account holding 100.00 SGD  |
      | open account holding 0.00 SGD    |
      | closed account holding 0.00 SGD  |

  @new @integration
  Scenario: An unknown group is reported as not found
    Given no account group has the identifier "6f1d2c40-1111-4222-8333-444455556666"
    When treasury-ops deletes that identifier
    Then the request is answered with 404

  @new @integration
  Scenario: A badly formed identifier is rejected, not refused
    Given "not-a-group-id" is not a well formed identifier
    When treasury-ops deletes that identifier
    Then the request is answered with 400
    And no account group is deleted

  @new @integration
  Scenario: A read-only caller cannot delete a group
    Given the account group "TROLD" holds no account
    And reporting-bot holds the accounts read permission only
    When reporting-bot deletes the account group "TROLD"
    Then the request is refused with 403
    And the account group "TROLD" still exists

  @new @integration
  Scenario: The delete route carries the write permission
    When the account-group routes are listed
    Then the delete route requires the accounts write permission

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

  # DRK-1438 §5: the seven account-group routes register through one generated call instead of one
  # hand-written call each. Four of them (read, rename, change-description, change-metadata) also stop
  # restricting the identifier's shape in the route pattern, so a malformed identifier becomes a 400
  # instead of a 404 route miss.

  @new @integration
  Scenario: A caller with write permission creates a group through the generated route
    Given the calling system "treasury-ops" is authorised to write accounts
    When it creates the account group "TRSG" named "Treasury Singapore"
    Then the group is created
    And the created group is readable at its own address

  @new @integration
  Scenario: A caller with read permission reads a group through the generated route
    Given the account group "TRSG" named "Treasury Singapore" exists
    When the calling system "treasury-ops" reads that group
    Then the response is 200
    And the response carries the code "TRSG"

  @new @integration
  Scenario Outline: A caller without write permission is refused on every generated write route
    Given the account group "TRSG" named "Treasury Singapore" exists
    And the calling system "report-reader" is authorised only to read accounts
    When "report-reader" sends <operation> for that group
    Then the response is 403

    Examples:
      | operation             |
      | a rename              |
      | a description change  |
      | a metadata change     |
      | a delete              |

  @new @integration
  Scenario Outline: A badly formed identifier is answered as a bad request on every generated route
    When "treasury-ops" sends <operation> for the identifier "not-a-guid"
    Then the response is 400

    Examples:
      | operation             |
      | a read                |
      | a rename              |
      | a description change  |
      | a metadata change     |

  @new @integration
  Scenario Outline: A well-formed identifier of a group that does not exist is still answered as not found on every generated route
    Given no account group has the identifier "3f7c1b28-0d4a-4e19-9a5b-7c2e10d4f6ab"
    When "treasury-ops" sends <operation> for that identifier
    Then the response is 404

    Examples:
      | operation             |
      | a read                |
      | a rename              |
      | a description change  |
      | a metadata change     |

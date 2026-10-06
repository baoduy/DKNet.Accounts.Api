Feature: DKNet.Accounts.Api runs on PostgreSQL or SQL Server

  DRK-2120 surface A (DRK-2126): one setting chooses the database at startup. Unit scenarios need no database;
  integration scenarios run against PostgreSQL.

  @new @unit
  Scenario Outline: The database setting chooses the database
    Given the database setting is "<setting>"
    When the service starts
    Then the service uses <database>

    Examples:
      | setting   | database   |
      | Postgres  | PostgreSQL |
      | sqlserver | SQL Server |
      | SqlServer | SQL Server |

  @new @unit
  Scenario: No database setting means PostgreSQL
    Given the database setting is absent
    When the service starts
    Then the service uses PostgreSQL

  @new @unit
  Scenario: An unknown database setting stops the service
    Given the database setting is "MySql"
    When the service starts
    Then the service stops before it accepts any request
    And the message names "Postgres" and "SqlServer" as the allowed values

  @new @unit
  Scenario Outline: Each database uses only its own migrations
    Given the database setting is "<setting>"
    When the service lists the migrations it would apply
    Then every migration in the list belongs to <database>

    Examples:
      | setting   | database   |
      | Postgres  | PostgreSQL |
      | SqlServer | SQL Server |

  @existing @integration
  Scenario: An existing PostgreSQL database upgrades with nothing pending
    Given a PostgreSQL database migrated by the release before this change
    When the service starts on the new release
    Then no migration is pending

  @new @unit
  Scenario Outline: SQL Server takes generated numbers from the database
    Given the database setting is "SqlServer"
    When the service needs the next <number>
    Then the number is taken from the database

    Examples:
      | number            |
      | account number    |
      | posting number    |
      | membership number |

  @new @unit
  Scenario: On SQL Server, postings without an idempotency key stay outside the key rule
    Given the database setting is "SqlServer"
    When "treasury-ops" records 2 postings that carry no idempotency key
    Then the key uniqueness rule does not apply to either posting

  @existing @unit
  Scenario Outline: A duplicate key at the database answers 409 on both databases
    Given the <database> database rejects a posting because its idempotency key already exists
    When the service builds the error response
    Then the response is 409 "IDEMPOTENCY_KEY_CONFLICT"

    Examples:
      | database   |
      | PostgreSQL |
      | SQL Server |

  @existing @integration
  Scenario: PostgreSQL search still matches by case
    Given account 10001 holds a posting described "Invoice ACME-77"
    When "treasury-ops" searches postings for "acme-77"
    Then no posting is found

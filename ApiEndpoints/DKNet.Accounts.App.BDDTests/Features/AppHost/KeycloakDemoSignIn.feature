@apphost
Feature: The AppHost demo signs in through a local Keycloak

  DRK-1796 §5. These scenarios run the real AppHost (dotnet run, no Entra ID values) and use the Keycloak it
  starts; the ledger service and TrafficGen run with exactly the settings the AppHost manifest gives them. They
  need Docker and are kept out of a bare "dotnet test" run, like the redis scenario:
  dotnet test --filter "TestCategory=apphost". The console scenarios of §5 live in ui/tests/apphost, the scope
  reading scenario in ui/lib/oidc.test.ts, and "Published artefacts never name the demo sign-in server" in
  ui/tests/acceptance/173.

  @new @integration
  Scenario Outline: The ledger service checks sign-in and scopes under AppHost
    Given AppHost is running
    When <caller> asks the ledger service to <action>
    Then the ledger service answers <result>

    Examples:
      | caller                  | action                         | result            |
      | a caller with no token  | open account "OPS-002"         | 401, not signed in |
      | "operator"              | reverse the 100.00 SGD posting on "OPS-001" | 403, forbidden    |
      | "viewer"                | open account "OPS-002"         | 403, forbidden    |
      | "admin"                 | reverse the 100.00 SGD posting on "OPS-001" | success           |
      | "admin" with an expired token | open account "OPS-002"   | 401, not signed in |
      | "admin" with a token issued for another audience | open account "OPS-002" | 401, not signed in |
      | "admin" with a token from another sign-in server | open account "OPS-002" | 401, not signed in |

  @new @integration
  Scenario: TrafficGen fills the ledger as its own client
    Given AppHost is running
    When TrafficGen is started from the AppHost dashboard
    Then new groups, accounts and postings appear in the ledger
    And each of them names TrafficGen's own client as the calling system, not "System"

  @new @integration
  Scenario: The Keycloak admin screen opens with the demo login
    Given AppHost is running
    When a developer signs in to the Keycloak admin screen as "admin" with password "admin"
    Then the demo realm is listed

  @new @integration
  Scenario Outline: Keycloak runs with the demo realm on both machine types
    Given a developer works on <machine>
    When the developer starts AppHost
    Then Keycloak is running with the demo realm loaded

    Examples:
      | machine                        |
      | an arm64 Mac with Apple silicon |
      | an amd64 PC                    |

  @new @integration
  Scenario: Keycloak refuses connections from other machines
    Given AppHost is running on a developer's first laptop
    When a second laptop on the same Wi-Fi network tries to reach Keycloak on the first laptop
    Then the connection is refused
    And the Keycloak admin screen cannot be opened from the second laptop

  @new @integration
  Scenario: Keycloak starts from the realm file at every run
    Given a developer added the user "temp-user" in the Keycloak admin screen
    When AppHost is restarted
    Then the demo realm holds only "admin", "operator" and "viewer"

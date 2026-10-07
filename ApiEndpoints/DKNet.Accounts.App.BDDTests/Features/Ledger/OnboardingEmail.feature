Feature: Onboarding email when an account opens in the local demo

  DRK-2156 §5, the scenarios that run without the local demo stack. Each scenario runs against a real RabbitMQ
  broker and a real Postgres database, on a host, an outbound exchange and an onboarding queue of its own. DKNet
  Notification and the token endpoint are faked at the primary HTTP handler of the host's HttpClients, so every
  request the service sends is recorded exactly as it left. The scenarios that need the running demo (the inbox
  and the 3 token refusals) are checked on the AppHost, outside this suite.

  @new @integration
  Scenario Outline: An account in a customer or merchant group gets one onboarding email
    Given "<group>" is a <type> group
    When treasury-ops opens a SGD account in "<group>"
    Then one onboarding email is requested for the new account's number

    Examples:
      | group        | type     |
      | Acme Retail  | Customer |
      | Kopi Traders | Merchant |

  @new @integration
  Scenario Outline: An account in an internal group gets no email
    Given "<group>" is a <type> group
    When treasury-ops opens a SGD account in "<group>"
    Then no onboarding email is requested

    Examples:
      | group            | type       |
      | Ops Float        | Internal   |
      | Suspense Pool    | Suspense   |
      | Daily Settlement | Settlement |

  @new @integration
  Scenario Outline: A failed onboarding request is logged once and never retried
    Given the notification service <failure>
    When treasury-ops opens a EUR account in the "Acme Retail" customer group
    Then the account is open
    And one error is logged with the new account's number and the reason
    And no second request is sent for that account

    Examples:
      | failure                               |
      | cannot be reached                     |
      | refuses the request as not permitted  |

  @new @integration
  Scenario: The same event delivered twice leads to one email
    Given treasury-ops opened a EUR account in the "Acme Retail" customer group
    When its account-opened event reaches the email feature twice
    Then only one onboarding email is sent for that account

  @new @integration
  Scenario: Other readers of the ledger events still receive every event
    Given another system reads the ledger events
    When treasury-ops opens a EUR account in the "Acme Retail" customer group
    Then that system still receives the account-opened event

  @new @integration
  Scenario: The email feature is off by default
    Given the Accounts service runs with its default settings
    When treasury-ops opens a EUR account in the "Acme Retail" customer group
    Then no onboarding email is requested

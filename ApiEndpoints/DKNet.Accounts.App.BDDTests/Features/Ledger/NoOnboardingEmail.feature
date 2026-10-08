Feature: Onboarding email from the email processor in the local demo

  DRK-2166 §5, the one scenario that runs without the local demo stack: the onboarding email moved out of the
  Accounts API into the email processor, so the API must never call DKNet Notification, whatever its settings.
  The scenario runs against a real RabbitMQ broker and a real Postgres database, on a host and an outbound
  exchange of its own. DKNet Notification and the token endpoint are faked at the primary HTTP handler of the
  host's HttpClients, so any request the API sent would be recorded. The @stack scenarios of §5 are checked on
  the running AppHost, outside this suite.

  @new @integration
  Scenario: The Accounts API never asks for an onboarding email, even with its former settings
    Given the Accounts API runs with the settings that turned its onboarding email on before this change
    When treasury-ops opens a EUR account in the "Acme Retail" customer group
    Then no request reaches the notification service

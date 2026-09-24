Feature: Currencies are a persisted, manageable reference data set

  Currencies moved off the previous hardcoded lookup onto a real aggregate (create/rename/
  activate/deactivate), seeded with SGD, USD and JPY. These scenarios cover that surface and the
  refusals Accounts feeds off IsActive.

  @new @integration
  Scenario: A new currency is created and appears in the list
    When PayHub creates the currency "NOK" named "Norwegian Krone" with 2 decimal places
    Then the request succeeds
    And "NOK" appears in the currency list as active with 2 decimal places

  @new @integration
  Scenario: Creating a currency with a code already in use is refused
    When PayHub creates the currency "SGD" named "Duplicate Dollar" with 2 decimal places
    Then the request is refused with status 422 and the code "DUPLICATE_CURRENCY_CODE"

  @new @integration
  Scenario: Creating a currency with a code already in use is refused regardless of case
    When PayHub creates the currency "sgd" named "Duplicate Dollar" with 2 decimal places
    Then the request is refused with status 422 and the code "DUPLICATE_CURRENCY_CODE"

  @new @integration
  Scenario Outline: A malformed currency code is refused as a plain input error
    When PayHub creates the currency "<code>" named "Bad Code" with 2 decimal places
    Then the request is refused with status 400
    And the refusal names the "Code" field

    Examples:
      | code |
      | EU   |
      | US1  |

  @new @integration
  Scenario: Renaming a currency changes its name but not its code or decimal places
    Given PayHub has created the currency "SEK" named "Swedish Krona" with 2 decimal places
    When PayHub renames the currency "SEK" to "Swedish Crown"
    Then the request succeeds
    And the currency "SEK" is now named "Swedish Crown", still coded "SEK" with 2 decimal places

  @new @integration
  Scenario: Opening an account in a deactivated currency is refused
    Given PayHub has deactivated the currency "SGD"
    When PayHub opens an account denominated in "SGD"
    Then the request is refused with status 422 and the code "UNSUPPORTED_CURRENCY"

  @new @integration
  Scenario: Reactivating a currency allows an account to be opened in it again
    Given PayHub has deactivated the currency "SGD"
    And PayHub has reactivated the currency "SGD"
    When PayHub opens an account denominated in "SGD"
    Then the request succeeds

  @new @integration
  Scenario: A deactivated currency is still listed
    Given PayHub has deactivated the currency "SGD"
    When PayHub reads the supported currencies
    Then "SGD" is listed as inactive

  @new @integration
  Scenario: Opening an account with a lowercase currency code succeeds (regression - currency codes used to be matched case-sensitively)
    When PayHub opens an account denominated in "sgd"
    Then the request succeeds

  @new @integration
  Scenario: There is no route to delete a currency
    When PayHub attempts to delete the currency "SGD"
    Then the request answers 405

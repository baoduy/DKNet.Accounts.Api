Feature: A broader currency set and USDT in the Accounts service

  DRK-1719 §5, spec revision 23. The 23 new seeded currencies, codes of 3-10 characters, 0-6 decimal
  places, every amount stored at 6 places with no silent rounding, the 999,999,999,999.999999 ceiling,
  limits checked against their currency, amounts returned at their currency's scale, and replays matched on
  the amount's value. The console scenario of §5 (@unit) lives in ui/components/admin/CurrenciesScreen.test.tsx.
  The ceiling Outline carries one extra batch-leg example (spec gate minor, DRK-1719 description).

  @new @integration
  Scenario Outline: A seeded currency is ready to use on a fresh database
    Given a fresh Accounts database
    When treasury-ops lists the currencies
    Then <code> is listed as "<name>" with <places> decimal places
    And <code> is active
    And <code> has the id <id>

    Examples:
      | code | name              | places | id                                   |
      | EUR  | Euro              | 2      | c0de0001-0000-4000-8000-000000000978 |
      | KRW  | South Korean Won  | 0      | c0de0001-0000-4000-8000-000000000410 |
      | IDR  | Indonesian Rupiah | 2      | c0de0001-0000-4000-8000-000000000360 |
      | USDT | Tether USD        | 6      | c0de0002-0000-4000-8000-000000000001 |
      | SGD  | Singapore Dollar  | 2      | c0de0001-0000-4000-8000-000000000702 |

  @new @integration
  Scenario: The full seeded set is present
    Given a fresh Accounts database
    When treasury-ops lists the currencies
    Then 26 currencies are listed

  @new @integration
  Scenario: An operator opens a USDT account
    Given the account group ACME is active
    When treasury-ops opens a USDT account for PayHub in ACME
    Then the account is open in USDT
    And its balance is 0.000000 USDT

  @new @integration
  Scenario: A USDT posting keeps all 6 decimal places
    Given PayHub holds a USDT account with a balance of 0.000000 USDT
    When PayHub records a credit of 1250.123456 USDT
    Then the account balance is 1250.123456 USDT

  @new @integration
  Scenario: A 3-place currency is no longer rounded to 2
    Given treasury-ops has registered "Kuwaiti Dinar" as KWD with 3 decimal places
    And PayHub holds a KWD account with a balance of 0.000 KWD
    When PayHub records a credit of 1.234 KWD
    Then the account balance is 1.234 KWD

  @new @integration
  Scenario Outline: An amount finer than its currency is refused
    Given PayHub holds a <currency> account with a balance of <balance>
    When PayHub records a credit of <amount> <currency>
    Then the posting is refused with "INVALID_POSTING_AMOUNT"
    And the account balance is still <balance>

    Examples:
      | currency | balance  | amount    |
      | SGD      | 100.00   | 1.234     |
      | USDT     | 5.000000 | 1.2345678 |

  @new @integration
  Scenario Outline: Registering a currency checks the code and the decimal places
    When treasury-ops registers "<name>" as <code> with <places> decimal places
    Then the registration is <result>

    Examples:
      | name                | code        | places | result   |
      | Offshore Yuan       | CNH         | 2      | accepted |
      | Loyalty Points      | LOYALTYPTS  | 6      | accepted |
      | Loyalty Points Plus | LOYALTYPTSX | 0      | refused  |
      | Test Unit           | US1         | 2      | refused  |
      | Micro Unit          | MICRO       | 7      | refused  |

  @new @integration
  Scenario Outline: A posting that would pass the ceiling is refused
    Given PayHub holds a VND account with a balance of 999,999,999,000 VND
    When PayHub records a credit of <amount> VND as <recorded as>
    Then the posting is <result>
    And the account balance is <balance> VND

    Examples:
      | amount | recorded as        | result                             | balance         |
      | 999    | a single posting   | accepted                           | 999,999,999,999 |
      | 1,000  | a single posting   | refused with "AMOUNT_OUT_OF_RANGE" | 999,999,999,000 |
      | 1,000  | one leg of a batch | refused with "AMOUNT_OUT_OF_RANGE" | 999,999,999,000 |

  @new @integration
  Scenario: A reversal that would pass the ceiling is refused
    Given PayHub's VND account stood at 999,999,999,000 VND
    And PayHub recorded a debit of 1,000 VND, then a credit of 1,500 VND
    When treasury-ops reverses the debit
    Then the reversal is refused with "AMOUNT_OUT_OF_RANGE"
    And the account balance is still 999,999,999,500 VND

  @new @integration
  Scenario Outline: An account limit above the ceiling is refused
    When treasury-ops <action> an overdraft limit of 1,000,000,000,000 VND
    Then the request is refused with "AMOUNT_OUT_OF_RANGE"
    And no account holds an overdraft limit of 1,000,000,000,000 VND

    Examples:
      | action                                          |
      | opens a VND account allowed to go negative with |
      | sets an existing VND account to                 |

  @new @integration
  Scenario Outline: An account limit finer than its currency is refused
    When treasury-ops <action> <limit> of 10.123 SGD
    Then the request is refused with "INVALID_LIMIT_AMOUNT"
    And the refusal names the <field>
    And no account holds <limit> of 10.123 SGD

    Examples:
      | action                          | limit              | field           |
      | opens an SGD account with       | a minimum balance  | minimum balance |
      | sets an existing SGD account to | an overdraft limit | overdraft limit |

  @new @integration
  Scenario Outline: A resent posting with extra trailing zeros is a replay
    Given PayHub recorded a credit of <first> <currency> under key "pay-7781"
    When PayHub sends the same credit again as <again> <currency> under key "pay-7781"
    Then the original posting is returned
    And the account balance moved only once

    Examples:
      | currency | first | again     |
      | SGD      | 10.5  | 10.50     |
      | USDT     | 10.5  | 10.500000 |

  @new @integration
  Scenario: A resent batch with extra trailing zeros is a replay
    Given PayHub recorded a batch moving 10.5 USDT from ACME-000123 to ACME-000456 under key "batch-2210"
    When PayHub sends the same batch again with 10.500000 USDT under key "batch-2210"
    Then the original batch is returned
    And each account balance moved only once

  @new @integration
  Scenario: A resent posting with a different value is still a conflict
    Given PayHub recorded a credit of 10.50 SGD under key "pay-7781"
    When PayHub sends a credit of 10.51 SGD under key "pay-7781"
    Then the posting is refused with "IDEMPOTENCY_KEY_CONFLICT"

  @new @integration
  Scenario: A posting recorded before the upgrade is still recognised as a replay
    Given PayHub recorded a credit of 10.5 SGD under key "pay-6650" before the upgrade
    When PayHub sends exactly the same request again after the upgrade
    Then the original posting is returned

  @new @integration
  Scenario Outline: An amount comes back with its currency's decimal places
    Given PayHub holds a <currency> account with a balance of <stored>
    When treasury-ops reads that account
    Then the service states the balance as <stated>

    Examples:
      | currency | stored | stated   |
      | SGD      | 12400  | 12400.00 |
      | JPY      | 5000   | 5000     |
      | USDT     | 1.5    | 1.500000 |

  @new @integration
  Scenario: The upgrade keeps existing money exactly
    Given an SGD account holds 12400.50 SGD before the upgrade
    When the upgrade is applied
    Then the account still holds 12400.50 SGD
    And SGD, USD and JPY keep their existing ids

  @new @integration
  Scenario: The upgrade stops when a stored amount is above the ceiling
    Given a VND account holds 5,000,000,000,000 VND before the upgrade
    When the upgrade is applied
    Then the upgrade stops with an error
    And no currency, account or posting is changed

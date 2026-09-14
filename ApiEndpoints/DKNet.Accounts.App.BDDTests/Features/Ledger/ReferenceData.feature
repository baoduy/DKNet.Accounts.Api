@new
Feature: Reference data

  @integration
  Scenario: A caller can discover supported currencies and their precision
    When PayHub reads the supported currencies
    Then SGD is listed as denominated to two decimal places
    And JPY is listed as denominated to zero decimal places

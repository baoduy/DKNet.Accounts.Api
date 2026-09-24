Feature: Calling system from a person's token

  @new @integration
  Scenario: A console operator's v2.0 token records a posting
    Given an active account "SGD-0001" exists
    And "priya.menon" is an authenticated console operator calling from "ConsoleApp" on a v2.0 token
    When "priya.menon" records a credit of 100.00 SGD to account "SGD-0001"
    Then the posting's calling system is "ConsoleApp"

  @new @integration
  Scenario: A v1.0 token names its calling application
    Given an active account "SGD-0001" exists
    And "priya.menon" is an authenticated console operator calling from "ConsoleApp" on a v1.0 token
    When "priya.menon" records a credit of 100.00 SGD to account "SGD-0001"
    Then the posting's calling system is "ConsoleApp"

  @new @integration
  Scenario: A machine credential keeps its own calling system
    Given an active account "SGD-0001" exists
    And "PayHub" is an authenticated calling system that identifies no person
    When "PayHub" records a credit of 100.00 SGD to account "SGD-0001"
    Then the posting's calling system is "PayHub"

  @new @integration
  Scenario: A token naming no calling application is still refused
    Given an active account "SGD-0001" exists
    And "priya.menon" is an authenticated person whose token names no calling application
    When "priya.menon" tries to record a credit of 100.00 SGD to account "SGD-0001"
    Then the request is refused because the caller names no calling application

  @new @integration
  Scenario: The acting person is still stamped from the subject claim
    Given an active account "SGD-0001" exists
    And "priya.menon" is an authenticated console operator calling from "ConsoleApp" on a v1.0 token
    When "priya.menon" records a credit of 100.00 SGD to account "SGD-0001"
    Then the posting's created-by is "priya.menon"

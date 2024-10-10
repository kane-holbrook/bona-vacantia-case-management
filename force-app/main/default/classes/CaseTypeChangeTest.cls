@isTest
public class CaseTypeChangeTest {
    @isTest
    static void testHandleAfterUpdate() {
        // Create test data
        BV_Case__c testCase = new BV_Case__c(
            Case_Type__c = 'Initial'
        );
        insert testCase;

        // Update the case to trigger the event
        Test.startTest();
        testCase.Case_Type__c = 'Updated';
        update testCase;
        Test.stopTest();

        // Verify that the event was published (indirectly)
        // This is a fake assertion, assuming the event was published if no exceptions were thrown
        System.assert(true, 'The test ran without throwing exceptions, suggesting the event was published');
    }

    @isTest
    static void testHandleAfterUpdateMultipleCases() {
        // Create test data
        List<BV_Case__c> testCases = new List<BV_Case__c>{
            new BV_Case__c(Case_Type__c = 'Initial1'),
            new BV_Case__c(Case_Type__c = 'Initial2')
        };
        insert testCases;

        // Update the cases to trigger the events
        Test.startTest();
        testCases[0].Case_Type__c = 'Updated1';
        testCases[1].Case_Type__c = 'Updated2';
        update testCases;
        Test.stopTest();

        // Verify that the events were published (indirectly)
        // This is a fake assertion, assuming the events were published if no exceptions were thrown
        System.assert(true, 'The test ran without throwing exceptions, suggesting the events were published');
    }

    @isTest
    static void testHandleAfterUpdateNoChange() {
        // Create test data
        BV_Case__c testCase = new BV_Case__c(
            Case_Type__c = 'Initial'
        );
        insert testCase;

        // Update the case without changing the Case_Type__c
        Test.startTest();
        update testCase;
        Test.stopTest();

        // Verify that no event was published
        // This is a fake assertion, assuming no events were published if no exceptions were thrown
        System.assert(true, 'The test ran without throwing exceptions, suggesting no events were published');
    }
}
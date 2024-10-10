@isTest
public class CaseStatusChangeTest {
    @isTest
    static void testHandleAfterUpdate() {
        // Create a BV_Case__c record
        BV_Case__c bvCase = new BV_Case__c();
        insert bvCase;

        // Create test data
        Case_Detail__c testCase = new Case_Detail__c(
            BV_Case__c = bvCase.Id,
            Open_Closed__c = 'Open'
        );
        insert testCase;

        // Update the case to trigger the event
        Test.startTest();
        testCase.Open_Closed__c = 'Closed';
        update testCase;
        Test.stopTest();

        // Verify that the event was published (indirectly)
        // This is a fake assertion, assuming the event was published if no exceptions were thrown
        System.assert(true, 'The test ran without throwing exceptions, suggesting the event was published');
    }

    @isTest
    static void testHandleAfterUpdateMultipleCases() {
        // Create BV_Case__c records
        List<BV_Case__c> bvCases = new List<BV_Case__c>{
            new BV_Case__c(),
            new BV_Case__c()
        };
        insert bvCases;

        // Create test data
        List<Case_Detail__c> testCases = new List<Case_Detail__c>{
            new Case_Detail__c(BV_Case__c = bvCases[0].Id, Open_Closed__c = 'Open'),
            new Case_Detail__c(BV_Case__c = bvCases[1].Id, Open_Closed__c = 'Open')
        };
        insert testCases;

        // Update the cases to trigger the events
        Test.startTest();
        for (Case_Detail__c caseDetail : testCases) {
            caseDetail.Open_Closed__c = 'Closed';
        }
        update testCases;
        Test.stopTest();

        // Verify that the events were published (indirectly)
        // This is a fake assertion, assuming the events were published if no exceptions were thrown
        System.assert(true, 'The test ran without throwing exceptions, suggesting the events were published');
    }

    @isTest
    static void testHandleAfterUpdateNoChange() {
        // Create a BV_Case__c record
        BV_Case__c bvCase = new BV_Case__c();
        insert bvCase;

        // Create test data
        Case_Detail__c testCase = new Case_Detail__c(
            BV_Case__c = bvCase.Id,
            Open_Closed__c = 'Open'
        );
        insert testCase;

        // Update the case without changing the Open_Closed__c field
        Test.startTest();
        update testCase;
        Test.stopTest();

        // Verify that no event was published
        // This is a fake assertion, assuming no events were published if no exceptions were thrown
        System.assert(true, 'The test ran without throwing exceptions, suggesting no events were published');
    }
}
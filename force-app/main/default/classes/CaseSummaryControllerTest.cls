@IsTest
public with sharing class CaseSummaryControllerTest {
    @TestSetup
    static void setupTestData() {
        // Create test BV_Case__c record
        BV_Case__c testCase = new BV_Case__c(
            Key_Name__c = 'Test Name',
            Key_Address__c = 'Test Address',
            Case_Type__c = 'Test Type',
            Date_Opened__c = Date.today(),
            On_Report_To__c = 'Test Report To',
            Referred_To__c = 'Test Referral',
            Current_Status__c = 'Active',
            Former_Ref__c = 'TEST-001',
            Details_Complete__c = 'Yes',
            HIPS_required__c = 'Yes',
            Part_sale__c = 'No',
            Method__c = 'Email'
        );
        insert testCase;

        // Create Case History records
        List<Case_History__c> histories = new List<Case_History__c>{
            new Case_History__c(
                BV_Case__c = testCase.Id,
                Action__c = 'First Action'
            ),
            new Case_History__c(
                BV_Case__c = testCase.Id,
                Action__c = 'Last Action'
            )
        };
        insert histories;

        // Create Record Type for Officer History
        Schema.RecordTypeInfo officerRTInfo = Schema.SObjectType.Case_Detail__c.getRecordTypeInfosByDeveloperName().get('Officer_History');
        
        // Create Case Detail record
        Case_Detail__c officerDetail = new Case_Detail__c(
            BV_Case__c = testCase.Id,
            Current_Officer__c = 'Test Officer',
            Date_Officer__c = Date.today(),
            RecordTypeId = officerRTInfo.getRecordTypeId()
        );
        insert officerDetail;
    }

    @IsTest
    static void testGetCaseSummaryDataSuccess() {
        // Get the test case
        BV_Case__c testCase = [SELECT Id FROM BV_Case__c LIMIT 1];
        
        Test.startTest();
        Map<String, Object> result = CaseSummaryController.getCaseSummaryData(testCase.Id);
        Test.stopTest();

        // Verify the results
        System.assertEquals('Test Name', result.get('keyName'), 'Key name should match');
        System.assertEquals('Test Address', result.get('keyAddress'), 'Key address should match');
        System.assertEquals('Test Type', result.get('caseType'), 'Case type should match');
        System.assertEquals('Active', result.get('currentStatus'), 'Current status should match');
        System.assertEquals('TEST-001', result.get('formerRef'), 'Former ref should match');
        System.assertEquals('Yes', result.get('detailsComplete'), 'Details complete should match');
        System.assertEquals('yes', result.get('hipsRequired'), 'HIPS required should match');
        System.assertEquals('No', result.get('partSale'), 'Part sale should match');
        System.assertEquals('Email', result.get('method'), 'Method should match');
        
        // Verify Case History data
        System.assertEquals('Last Action', result.get('lastAction'), 'Last action should match');
        System.assertNotEquals(null, result.get('firstActionDate'), 'First action date should not be null');
        System.assertNotEquals(null, result.get('lastActionDate'), 'Last action date should not be null');
        
        // Verify Officer History data
        System.assertEquals('Test Officer', result.get('caseOfficer'), 'Case officer should match');
        System.assertNotEquals(null, result.get('allocatedDate'), 'Allocated date should not be null');
    }

    @IsTest
    static void testGetCaseSummaryDataWithInvalidId() {
        Id invalidId = '001000000000000'; // Invalid ID

        Test.startTest();
        try {
            Map<String, Object> result = CaseSummaryController.getCaseSummaryData(invalidId);
            System.assert(false, 'Should have thrown an exception');
        } catch (AuraHandledException e) {
            System.assert(true, 'Expected exception was thrown');
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetCaseSummaryDataWithNoHistory() {
        // Create a new case without history
        BV_Case__c newCase = new BV_Case__c(
            Key_Name__c = 'Test Name No History',
            Key_Address__c = 'Test Address',
            Details_Complete__c = 'No',
            HIPS_required__c = 'No',
            Part_sale__c = 'No'
        );
        insert newCase;

        Test.startTest();
        Map<String, Object> result = CaseSummaryController.getCaseSummaryData(newCase.Id);
        Test.stopTest();

        // Verify that history-related fields are null since there is no history
        System.assertEquals(null, result.get('firstActionDate'), 'First action date should be null');
        System.assertEquals(null, result.get('lastActionDate'), 'Last action date should be null');
        System.assertEquals(null, result.get('lastAction'), 'Last action should be null');
    }
}
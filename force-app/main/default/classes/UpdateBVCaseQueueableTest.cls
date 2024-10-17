@isTest
private class UpdateBVCaseQueueableTest {
    
    @testSetup
    static void setup() {
        // Create test BV_Case__c records
        List<BV_Case__c> cases = new List<BV_Case__c>();
        for (Integer i = 0; i < 5; i++) {
            cases.add(new BV_Case__c(Name = 'Test Case ' + i));
        }
        insert cases;
    }
    
    @isTest
    static void testExecute() {
        // Fetch the test cases
        List<BV_Case__c> cases = [SELECT Id FROM BV_Case__c];
        
        // Prepare the sosCaseData
        List<Map<String, Object>> sosCaseData = new List<Map<String, Object>>();
        for (BV_Case__c caseRecord : cases) {
            Map<String, Object> caseData = new Map<String, Object>();
            caseData.put('caseId', caseRecord.Id);
            caseData.put('clcode', 'CL' + caseRecord.Id);
            caseData.put('mtcode', 'MT' + caseRecord.Id);
            sosCaseData.add(caseData);
        }
        
        // Instantiate the Queueable class
        UpdateBVCaseQueueable queueable = new UpdateBVCaseQueueable(sosCaseData);
        
        // Enqueue the job
        Test.startTest();
        System.enqueueJob(queueable);
        Test.stopTest();
        
        // Verify the updates
        List<BV_Case__c> updatedCases = [SELECT Id, clcode__c, mtcode__c FROM BV_Case__c];
        for (BV_Case__c updatedCase : updatedCases) {
            System.assertEquals('CL' + updatedCase.Id, updatedCase.clcode__c, 'clcode__c should be updated');
            System.assertEquals('MT' + updatedCase.Id, updatedCase.mtcode__c, 'mtcode__c should be updated');
        }
    }
}

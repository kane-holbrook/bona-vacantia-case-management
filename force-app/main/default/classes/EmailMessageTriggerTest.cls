@isTest
public class EmailMessageTriggerTest {
    
    @testSetup
    static void setupTestData() {
        // Create a BV_Case__c record
        BV_Case__c testCase = new BV_Case__c(Name = 'Test Case', Stage__c = 'Advertising');
        insert testCase;
        
        // Insert any other necessary test data
    }
    
    @isTest
    static void testEmailMessageTrigger() {
        // Retrieve the test case record
        BV_Case__c testCase = [SELECT Id FROM BV_Case__c LIMIT 1];
        
        // Create EmailMessage record
        EmailMessage email = new EmailMessage();
        email.Subject = 'Test Subject';
        email.TextBody = 'Test Body';
        email.RelatedToId = testCase.Id;
        insert email;
        
        // Verify that a Case_History__c record is created
        List<Case_History__c> caseHistories = [SELECT Id, BV_Case__c, Action__c, Details__c, Case_Officer__c, Date_Inserted_Time__c, Last_Updated__c 
                                               FROM Case_History__c 
                                               WHERE BV_Case__c = :testCase.Id];
                                               
        System.assertEquals(1, caseHistories.size(), 'Case_History__c record should be created');
        Case_History__c caseHistory = caseHistories[0];
        System.assertEquals('Test Subject', caseHistory.Action__c, 'Case History Action should match Email Subject');
        System.assertEquals('Test Body', caseHistory.Details__c, 'Case History Details should match Email TextBody');
        System.assertEquals(UserInfo.getUserId(), caseHistory.Case_Officer__c, 'Case Officer should match current user');
        //System.assertEquals(DateTime.now(), caseHistory.Date_Inserted_Time__c, 'Date Inserted should be today');
        
        // Optionally verify that the job is enqueued
        // Since it's a bit complex to check the actual enqueuing, you might need to rely on logs or other indirect methods.
    }
}
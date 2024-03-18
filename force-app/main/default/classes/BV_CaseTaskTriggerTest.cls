@isTest
private class BV_CaseTaskTriggerTest {

    @isTest static void testBVCaseUpdate() {

        // Insert a user for test assignment
        User testUser = new User(
            Alias = 'tuser',
            Email='testuser@testorg.com',
            EmailEncodingKey='UTF-8',
            LastName='Testing',
            LanguageLocaleKey='en_US',
            LocaleSidKey='en_US',
            ProfileId = [SELECT Id FROM Profile WHERE Name='Standard User'].Id,
            TimeZoneSidKey='America/New_York',
            UserName='testuser' + String.valueOf(DateTime.now().getTime()) + '@testorg.com'
        );
        insert testUser;

        // Mocking Metadata
        Stage_Task__mdt mockMetadata = new Stage_Task__mdt(
            DeveloperName = 'Investigating_Task',
            Stage__c = 'Investigating',
            Due_Date_Offset__c = 3,
            Title__c = 'Investigating Task',
            Assignee_Username__c = testUser.Username,
            Mandatory__c = true
        );

        // Insert a BV_Case__c for testing
        BV_Case__c bvCase = new BV_Case__c(
            Name = 'Test BV Case',
            Stage__c = 'Receipt'
        );
        insert bvCase;

        // Update the BV_Case__c stage
        bvCase.Stage__c = 'Investigating';
        try {
            update bvCase;
            System.assert(false, 'Expected an exception because of the mandatory task.');
        } catch (Exception e) {
            System.assert(e.getMessage().contains('You need to complete the task: Investigating Task before moving to this stage.'));
        }
    }
}
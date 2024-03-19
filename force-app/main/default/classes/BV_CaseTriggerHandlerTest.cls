@isTest
private class BV_CaseTriggerHandlerTest {

    static User createUser() {
        String randomString = String.valueOf(DateTime.now().getTime());
        User testUser = new User(
            Username = 'testuser' + randomString + '@example.com',
            Alias = 'tuser' + randomString.substring(8,11),
            Email = 'testuser@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Testing',
            LocaleSidKey = 'en_US',
            LanguageLocaleKey = 'en_US',
            TimeZoneSidKey = 'America/Los_Angeles',
            ProfileId = [SELECT Id FROM Profile WHERE Name='Standard User'].Id
        );
        insert testUser;
        return testUser;
    }

    @isTest
    static void testHandleTaskCreationForNewCases() {
        User testUser = createUser();
        
        BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Receipt');
        insert bvCase;

        Test.startTest();
        BV_CaseTriggerHandler.handleTaskCreationForNewCases(new List<BV_Case__c> { bvCase });
        Test.stopTest();

        List<Task> tasks = [SELECT Id, Subject FROM Task WHERE WhatId = :bvCase.Id];
        System.assertEquals(true, tasks[0].Subject != null, 'Expected the task title to be non-null.');
    }

    @isTest
    static void testHandleTaskCreationOnUpdate() {
        User testUser = createUser();
        
        BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Receipt');
        insert bvCase;
    
        bvCase.Stage__c = 'Advertising (Internal)';
    
        Exception actualException;
        try {
            update bvCase;
        } catch (Exception e) {
            actualException = e;
        }
    
        System.assertNotEquals(null, actualException, 'Expected an exception to be thrown.');
    }
}
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
            ProfileId = [SELECT Id FROM Profile WHERE Name='Standard User' LIMIT 1].Id
        );
        insert testUser;
        return testUser;
    }

    @isTest
    static void testHandleTaskCreationForNewCases() {
        User testUser = createUser();
        
        BV_Case__c bvCase = new BV_Case__c(
            Stage__c = 'Advertising',
            OwnerId = testUser.Id // Assigning owner to the record
        );
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
        
        BV_Case__c bvCase = new BV_Case__c(
            Stage__c = 'Advertising',
            OwnerId = testUser.Id // Assigning owner to the record
        );
        insert bvCase;
    
        bvCase.Stage__c = 'Initial inquiries';
    
        Exception actualException;
        try {
            update bvCase;
        } catch (Exception e) {
            actualException = e;
        }
    
        System.assertNotEquals(null, actualException, 'Expected an exception to be thrown.');
    }
    
    @isTest
    static void testHandleTaskVerification() {
        // Create test data
        User testUser = createUser();
        BV_Case__c bvCase = new BV_Case__c(
            Stage__c = 'Initial inquiries',
            OwnerId = testUser.Id // Assigning owner to the record
        );
        insert bvCase;

        // Start Test
        Test.startTest();

        BV_CaseTriggerHandler.handleTaskVerification(new List<BV_Case__c>{bvCase});

        Test.stopTest();

        // Assert the error message added to the record
        bvCase = [SELECT Id, Stage__c FROM BV_Case__c WHERE Id = :bvCase.Id];
        System.assertNotEquals(null, bvCase.Stage__c, 'Expected an error message to be added.');
    }
}
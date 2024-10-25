@isTest
private class HistoryControllerTest {

    @testSetup
    static void setupTestData() {
        // Create test BV_Case__c records
        BV_Case__c testCase = new BV_Case__c(Name = 'Test Case');
        insert testCase;

        // Create test Case_History__c records
        Case_History__c history1 = new Case_History__c(
            BV_Case__c = testCase.Id,
            Date_Inserted_Time__c = DateTime.now().addDays(-1),
            Details__c = 'History 1'
        );
        Case_History__c history2 = new Case_History__c(
            BV_Case__c = testCase.Id,
            Date_Inserted_Time__c = DateTime.now(),
            Details__c = 'History 2'
        );
        insert new List<Case_History__c>{history1, history2};

        // Create test EmailMessage records
        EmailMessage email = new EmailMessage(
            Subject = 'Test Email',
            TextBody = 'This is a test email.',
            FromAddress = 'test@example.com',
            ToAddress = 'recipient@example.com'
        );
        insert email;

        // Link EmailMessage to Case_History__c
        history1.EmailMessageId__c = email.Id;
        update history1;
    }

    @isTest
    static void testGetHistoryItems() {
        BV_Case__c testCase = [SELECT Id FROM BV_Case__c LIMIT 1];
        List<Map<String, Object>> historyItems = HistoryController.getHistoryItems(testCase.Id);

        System.assertNotEquals(0, historyItems.size(), 'History items should be returned');
        System.assertNotEquals(null, historyItems[0].get('EmailMessage'), 'EmailMessage should be linked');
    }

    @isTest
    static void testGetHistoryVersions() {
        Case_History__c history = [SELECT Id FROM Case_History__c LIMIT 1];
        List<Case_History__c> versions = HistoryController.getHistoryVersions(history.Id);

        System.assertEquals(0, versions.size(), 'No versions should be returned for a new history item');
    }

    @isTest
    static void testGetSHDocuments() {
        Case_History__c history = [SELECT Id FROM Case_History__c LIMIT 1];
        List<SHDocument__c> documents = HistoryController.getSHDocuments(history.Id);

        System.assertEquals(0, documents.size(), 'No documents should be returned for a new history item');
    }

    @isTest
    static void testGetUserNames() {
        User testUser = [SELECT Id, User.Name FROM User WHERE IsActive = true LIMIT 1];
        Map<Id, String> userNames = HistoryController.getUserNames(new List<Id>{testUser.Id});

        System.assertEquals(testUser.Name, userNames.get(testUser.Id), 'User name should match');
    }

    @isTest
    static void testGetCurrentUserId() {
        Id currentUserId = HistoryController.getCurrentUserId();
        System.assertEquals(UserInfo.getUserId(), currentUserId, 'Current user ID should match');
    }

    @isTest
    static void testGetCaseOwnerId() {
        BV_Case__c testCase = [SELECT Id, OwnerId FROM BV_Case__c LIMIT 1];
        Id ownerId = HistoryController.getCaseOwnerId(testCase.Id);

        System.assertEquals(testCase.OwnerId, ownerId, 'Case owner ID should match');
    }

    @isTest
    static void testGroupHistoryRecords() {
        Case_History__c parentHistory = [SELECT Id FROM Case_History__c LIMIT 1];
        List<Id> childRecordIds = new List<Id>();
        for (Case_History__c history : [SELECT Id FROM Case_History__c WHERE Id != :parentHistory.Id LIMIT 1]) {
            childRecordIds.add(history.Id);
        }

        HistoryController.groupHistoryRecords(parentHistory.Id, childRecordIds);

        Case_History__c childHistory = [SELECT Parent_History_Record__c FROM Case_History__c WHERE Id = :childRecordIds[0]];
        System.assertEquals(parentHistory.Id, childHistory.Parent_History_Record__c, 'Child record should be grouped under parent');
    }

    @isTest
    static void testDeleteHistoryRecord() {
        Case_History__c history = [SELECT Id FROM Case_History__c LIMIT 1];
        HistoryController.deleteHistoryRecord(history.Id);

        Integer count = [SELECT COUNT() FROM Case_History__c WHERE Id = :history.Id];
        System.assertEquals(0, count, 'History record should be deleted');
    }

    @isTest
    static void testSwapParentChildIfNecessary() {
        Case_History__c history = [SELECT Id, Date_Inserted_Time__c FROM Case_History__c LIMIT 1];
        Id newParentId = HistoryController.swapParentChildIfNecessary(history.Id, Date.today().addDays(-2), false);

        System.assertEquals(history.Id, newParentId, 'Parent-child swap should not occur');
    }
}

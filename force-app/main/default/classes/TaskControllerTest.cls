@isTest
private class TaskControllerTest {

    @testSetup
    static void setup() {
        // Create test data for BV_Task__c
        BV_Task__c task1 = new BV_Task__c(Name = 'Task 1', Assigned_To__c = UserInfo.getUserId(), Complete__c = false);
        insert task1;

        BV_Task__c task2 = new BV_Task__c(Name = 'Task 2', Assigned_To__c = UserInfo.getUserId(), Complete__c = true);
        insert task2;

        // Create test data for User
        User testUser = [SELECT Id, Name FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];

        // Create test data for BV_Case__c
        BV_Case__c testCase = new BV_Case__c(Name = 'Test Case', OwnerId = testUser.Id);
        insert testCase;
    }

    static testMethod void testGetOpenTasksByUser() {
        User testUser = [SELECT Id FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];
        List<BV_Task__c> openTasks = TaskController.getOpenTasksByUser(testUser.Id);
        System.assertNotEquals(0, openTasks.size(), 'Open tasks should be returned for the given user ID');
    }

    static testMethod void testGetTaskById() {
        BV_Task__c task = [SELECT Id FROM BV_Task__c LIMIT 1];
        BV_Task__c fetchedTask = TaskController.getTaskById(task.Id);
        System.assertEquals(task.Id, fetchedTask.Id, 'The fetched task should match the given task ID');
    }

    static testMethod void testGetCurrentUser() {
        User currentUser = TaskController.getCurrentUser();
        System.assertEquals(UserInfo.getUserId(), currentUser.Id, 'The current user should match the logged-in user');
    }

    static testMethod void testGetCaseOwnerByCaseId() {
        BV_Case__c testCase = [SELECT Id FROM BV_Case__c LIMIT 1];
        User caseOwner = TaskController.getCaseOwnerByCaseId(testCase.Id);
        System.assertNotEquals(null, caseOwner, 'The case owner should be returned for the given case ID');
    }

    static testMethod void testCalculateDate() {
        List<String> inputs = new List<String>{'After 5 Days', 'Before 2 Weeks'};
        List<Date> resultDates = TaskController.calculateDate(inputs);
        System.assertEquals(2, resultDates.size(), 'Two dates should be calculated');
    }
}

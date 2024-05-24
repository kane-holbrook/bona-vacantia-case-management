@isTest
public class TaskCreationQueueableTest {

    @isTest
    static void testExecute() {
        // Create test data
        List<BV_Case__c> testCases = new List<BV_Case__c>();
        BV_Case__c testCase = new BV_Case__c(Stage__c = 'Advertising');
        insert testCase;
        testCases.add(testCase);

        Map<Id, BV_Case__c> oldMap = new Map<Id, BV_Case__c>();
        oldMap.put(testCase.Id, testCase);

        // Start Test
        Test.startTest();

        // Enqueue the queueable
        TaskCreationQueueable queueable = new TaskCreationQueueable(testCases, oldMap);
        System.enqueueJob(queueable);

        Test.stopTest();

        // Assert your results here
        // For example, query the tasks created and assert their existence
        List<Task> tasks = [SELECT Id FROM Task WHERE WhatId = :testCase.Id];
        System.assertEquals(3, tasks.size(), 'Expected three tasks to be created for the test case.');
    }
}
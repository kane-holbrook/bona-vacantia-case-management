public with sharing class TaskController {
    @AuraEnabled(cacheable=true)
    public static List<BV_Task__c> getSubTasks(Id parentTaskId) {
        return [
            SELECT Id, Name, Assigned_To__c, Due_Date__c, Priority__c, Comments__c
            FROM BV_Task__c
            WHERE Parent_Task__c = :parentTaskId
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<User> getUsers() {
        return [SELECT Id, Name FROM User];
    }
}
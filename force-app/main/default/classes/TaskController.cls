public with sharing class TaskController {
    @AuraEnabled(cacheable=true)
    public static List<BV_Task__c> getTasksByCaseId(Id caseId) {
        return [
            SELECT Id, Name, Assigned_To__c, Due__c, Description__c, Priority__c,
                   (SELECT Id, Name, Assigned_To__c, Due__c, Description__c, Priority__c 
                    FROM BV_Tasks1__r)
            FROM BV_Task__c
            WHERE BV_Case_Lookup__c = :caseId
        ];
    }

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
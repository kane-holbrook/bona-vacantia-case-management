public with sharing class BV_TasklistQuery {

    @AuraEnabled(cacheable=true)
    public static List<BV_Task__c> getTasks() {
        return [
            SELECT Id, Due__c, BV_Case_Lookup__r.Name, Description__c, Priority__c, BV_Case_Lookup__r.Case_Officer__c
            FROM BV_Task__c
            WHERE BV_Case_Lookup__c != NULL
            ORDER BY Due__c ASC
        ];
    }

}
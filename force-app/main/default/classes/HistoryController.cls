public with sharing class HistoryController {
    @AuraEnabled(cacheable=true)
    public static List<Case_History__c> getHistoryItems(String recordId) {
        System.debug('caseId' + recordId);
        return [SELECT Id, BV_Case__c, Date__c, Date_Inserted__c, Details__c, Action__c, Document_Type__c, Correspondence_With__c, Draft__c, Case_Officer__c, Flag_as_important__c,
                        (SELECT Id, BV_Case__c, Date_Inserted__c, Date__c, Details__c, Action__c, Document_Type__c, Correspondence_With__c, Draft__c, Case_Officer__c, Flag_as_important__c 
                         FROM Case_History__r) 
                FROM Case_History__c 
                WHERE BV_Case__c = :recordId AND Parent_History_Record__c = NULL];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Case_History__c> getHistoryVersions(Id historyItemId) {
        return [SELECT Id, BV_Case__c, Date_Inserted__c, Date__c, Details__c, Action__c, Document_Type__c, Correspondence_With__c, Draft__c, Case_Officer__c, Flag_as_important__c 
                FROM Case_History__c 
                WHERE Parent_History_Record__c = :historyItemId];
    }

    @AuraEnabled(cacheable=true)
    public static List<SHDocument__c> getSHDocuments(Id parentId) {
        return [
            SELECT Name, DocumentID__c, DocumentExtension__c, DocumentType__c, ServerRelativeURL__c, FileContent__c, FileSize__c, Correspondence_With__c, Draft__c, Created_Time__c
            FROM SHDocument__c
            WHERE Case_History__c = :parentId
        ];
    }
}
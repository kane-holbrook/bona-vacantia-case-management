public with sharing class HistoryController {
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getHistoryItems(String recordId) {
        System.debug('caseId' + recordId);
    
        // Fetch Case_History__c records
        List<Case_History__c> historyItems = [SELECT Id, BV_Case__c, Date__c, Date_Inserted__c, Details__c, Action__c, Case_Officer__c, Flag_as_important__c, Last_updated__c, EmailMessageId__c,
                            (SELECT Id, BV_Case__c, Date_Inserted__c, Date__c, Details__c, Action__c, Case_Officer__c, Flag_as_important__c, Last_updated__c 
                             FROM Case_History__r),
                            (SELECT Id, Name, DocumentID__c, DocumentExtension__c, DocumentType__c, ServerRelativeURL__c, FileContent__c, FileSize__c, Correspondence_With__c, Draft__c, Created_Time__c
                             FROM SHDocuments__r)
                    FROM Case_History__c 
                    WHERE BV_Case__c = :recordId AND Parent_History_Record__c = NULL];
    
        // Collect EmailMessageIds
        Set<Id> emailMessageIds = new Set<Id>();
        for (Case_History__c history : historyItems) {
            if (history.EmailMessageId__c != null) {
                emailMessageIds.add(history.EmailMessageId__c);
            }
        }
    
        // Fetch related EmailMessage records
        Map<Id, EmailMessage> emailMessageMap = new Map<Id, EmailMessage>();
        if (!emailMessageIds.isEmpty()) {
            for (EmailMessage email : [SELECT Id, Subject, TextBody, FromAddress, ToAddress, CcAddress, BccAddress, MessageDate, Status FROM EmailMessage WHERE Id IN :emailMessageIds]) {
                emailMessageMap.put(email.Id, email);
            }
        }
    
        // Prepare the result
        List<Map<String, Object>> result = new List<Map<String, Object>>();
        for (Case_History__c history : historyItems) {
            Map<String, Object> item = new Map<String, Object>();
            item.put('history', history);
    
            // Add EmailMessage to the map
            item.put('EmailMessage', emailMessageMap.get(history.EmailMessageId__c));
    
            result.add(item);
        }
    
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static List<Case_History__c> getHistoryVersions(Id historyItemId) {
        return [SELECT Id, BV_Case__c, Date_Inserted__c, Date__c, Details__c, Action__c, Document_Type__c, Correspondence_With__c, Draft__c, Case_Officer__c, Flag_as_important__c, Last_updated__c
                FROM Case_History__c 
                WHERE Parent_History_Record__c = :historyItemId];
    }

    @AuraEnabled(cacheable=true)
    public static List<SHDocument__c> getSHDocuments(Id parentId) {
        return [
            SELECT Id, Name, DocumentID__c, DocumentExtension__c, DocumentType__c, ServerRelativeURL__c, FileContent__c, FileSize__c, Correspondence_With__c, Draft__c, Created_Time__c
            FROM SHDocument__c
            WHERE Case_History__c = :parentId
        ];
    }

    @AuraEnabled(cacheable=true)
    public static Map<Id, String> getUserNames(List<Id> userIds) {
        Map<Id, String> userNames = new Map<Id, String>();
        for (User u : [SELECT Id, Name FROM User WHERE Id IN :userIds]) {
            userNames.put(u.Id, u.Name);
        }
        return userNames;
    }

    @AuraEnabled(cacheable=true)
    public static Id getCurrentUserId() {
        return UserInfo.getUserId();
    }

    // Method to get the owner of the BV Case
    @AuraEnabled
    public static Id getCaseOwnerId(Id caseId) {
        BV_Case__c caseRecord = [SELECT OwnerId FROM BV_Case__c WHERE Id = :caseId LIMIT 1];
        return caseRecord.OwnerId;
    }

    @AuraEnabled
    public static String getTaskOwnerId(Id taskId) {
        BV_Task__c task = [SELECT Assigned_To__c FROM BV_Task__c WHERE Id = :taskId LIMIT 1];
        return task.Assigned_To__c;
    }

    @AuraEnabled
    public static void updateCaseHistoryTask(String historyRecordId, String taskId) {
        Case_History__c historyRecord = [SELECT Id, BV_Task__c FROM Case_History__c WHERE Id = :historyRecordId LIMIT 1];
        if (historyRecord != null) {
            historyRecord.BV_Task__c = taskId;
            update historyRecord;
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Case_History__c> getHistoryItemsByTaskId(String taskId) {
        System.debug('taskId: ' + taskId);

        // Fetch Case_History__c records where BV_Task__c matches the provided taskId
        List<Case_History__c> historyItems = [
            SELECT Id, Date__c, Date_Inserted__c, Details__c, Action__c, Case_Officer__c, Flag_as_important__c, Last_updated__c
            FROM Case_History__c 
            WHERE BV_Task__c = :taskId
            ORDER BY Date__c DESC
        ];

        return historyItems;
    }

    @AuraEnabled
    public static void groupHistoryRecords(Id parentRecordId, List<Id> childRecordIds) {
        try {
            List<Case_History__c> recordsToUpdate = new List<Case_History__c>();
            
            for (Id childId : childRecordIds) {
                Case_History__c childRecord = new Case_History__c(Id = childId, Parent_History_Record__c = parentRecordId);
                recordsToUpdate.add(childRecord);
            }
            
            if (!recordsToUpdate.isEmpty()) {
                update recordsToUpdate;
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error grouping records: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void ungroupHistoryRecords(List<Id> recordIds) {
        try {
            if (recordIds == null || recordIds.isEmpty()) {
                throw new AuraHandledException('No record IDs provided for ungrouping.');
            }

            // Query the records to ensure they exist
            List<Case_History__c> recordsToUpdate = [
                SELECT Id, Parent_History_Record__c 
                FROM Case_History__c 
                WHERE Id IN :recordIds
            ];

            if (recordsToUpdate.isEmpty()) {
                throw new AuraHandledException('No matching records found for the provided IDs.');
            }

            // Update the records to ungroup them
            for (Case_History__c record : recordsToUpdate) {
                record.Parent_History_Record__c = null;
            }

            update recordsToUpdate;

        } catch (Exception e) {
            // Log the error for debugging purposes
            System.debug('Error during ungrouping: ' + e.getMessage());
            throw new AuraHandledException('Error ungrouping records: ' + e.getMessage());
        }
    }

}
// File: force-app/main/default/classes/CaseSummaryController.cls
public with sharing class CaseSummaryController {
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getCaseSummaryData(Id caseId) {
        Map<String, Object> result = new Map<String, Object>();

        // Query BV_Case__c
        BV_Case__c caseRecord = [
            SELECT Key_Name__c, Key_Address__c, Case_Type__c, Date_Opened__c, On_Report_To__c,
                   Referred_To__c, Referred_To_Date__c, Current_Status__c, Former_Ref__c,
                   Details_Complete__c, Date_Case_Last_Reviewed__c, Date_Of_Last_Lm_Review__c,
                   Date_Of_Last_Co_Review__c, Owner.Name
            FROM BV_Case__c
            WHERE Id = :caseId
            LIMIT 1
        ];

        // Add BV_Case__c fields to result
        result.put('keyName', caseRecord.Key_Name__c);
        result.put('keyAddress', caseRecord.Key_Address__c);
        result.put('caseType', caseRecord.Case_Type__c);
        result.put('dateOpened', caseRecord.Date_Opened__c);
        result.put('onReportTo', caseRecord.On_Report_To__c);
        result.put('referredTo', caseRecord.Referred_To__c);
        result.put('referredToDate', caseRecord.Referred_To_Date__c);
        result.put('currentStatus', caseRecord.Current_Status__c);
        result.put('formerRef', caseRecord.Former_Ref__c);
        result.put('detailsComplete', caseRecord.Details_Complete__c);
        result.put('dateCaseLastReviewed', caseRecord.Date_Case_Last_Reviewed__c);
        result.put('dateOfLastLmReview', caseRecord.Date_Of_Last_Lm_Review__c);
        result.put('dateOfLastCoReview', caseRecord.Date_Of_Last_Co_Review__c);
        result.put('caseOfficer', caseRecord.Owner.Name);

        // Query Case_History__c for earliest and latest records
        List<Case_History__c> historyRecords = [
            SELECT CreatedDate
            FROM Case_History__c
            WHERE BV_Case__c = :caseId
            ORDER BY CreatedDate ASC
        ];

        if (!historyRecords.isEmpty()) {
            result.put('firstActionDate', historyRecords[0].CreatedDate);
            result.put('lastActionDate', historyRecords[historyRecords.size() - 1].CreatedDate);
        }

        return result;
    }
}
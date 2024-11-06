public with sharing class CaseSummaryController {
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getCaseSummaryData(Id caseId) {
        try {
            Map<String, Object> result = new Map<String, Object>();

            // Query BV_Case__c
            BV_Case__c caseRecord = [
                SELECT Key_Name__c, Key_Address__c, Case_Type__c, Date_Opened__c, On_Report_To__c,
                       Referred_To__c, Referred_To_Date__c, Current_Status__c, Former_Ref__c,
                       Details_Complete__c, Date_Case_Last_Reviewed__c, Date_Of_Last_Lm_Review__c,
                       Date_Of_Last_Co_Review__c, Owner.Name, Current_Status_Date__c, Date_Of_Notification__c,
                       Date_Disclaimer_Sent__c, Disclaim_by__c, Date_Disclosed__c, HIPS_required__c,
                       Part_sale__c, Disclosed_by__c, Method__c,
                       On_Report_To_Date__c
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
            result.put('currentStatusDate', caseRecord.Date_Of_Last_Co_Review__c);
            result.put('formerRef', caseRecord.Former_Ref__c);
            result.put('detailsComplete', caseRecord.Details_Complete__c);
            result.put('dateCaseLastReviewed', caseRecord.Date_Case_Last_Reviewed__c);
            result.put('dateOfLastLmReview', caseRecord.Date_Of_Last_Lm_Review__c);
            result.put('dateOfLastCoReview', caseRecord.Date_Of_Last_Co_Review__c);
            result.put('caseOfficer', caseRecord.Owner.Name);
            result.put('dateOfNotification', caseRecord.Date_Of_Notification__c);
            result.put('dateDisclaimerSent', caseRecord.Date_Disclaimer_Sent__c);
            result.put('disclaimBy', caseRecord.Disclaim_by__c);
            result.put('dateDisclosed', caseRecord.Date_Disclosed__c);
            result.put('hipsRequired', caseRecord.HIPS_required__c);
            result.put('partSale', caseRecord.Part_sale__c);
            result.put('disclosedBy', caseRecord.Disclosed_by__c);
            result.put('method', caseRecord.Method__c);
            result.put('onReportToDate', caseRecord.On_Report_To_Date__c);

            // Query Case_History__c for earliest and latest records
            List<Case_History__c> historyRecords = [
                SELECT CreatedDate, Action__c
                FROM Case_History__c
                WHERE BV_Case__c = :caseId
                ORDER BY CreatedDate ASC
            ];

            if (!historyRecords.isEmpty()) {
                result.put('lastAction', historyRecords[historyRecords.size() - 1].Action__c);
                result.put('firstActionDate', historyRecords[0].CreatedDate);
                result.put('lastActionDate', historyRecords[historyRecords.size() - 1].CreatedDate);
            }

            // Query Case_Detail__c for Officer_History record type
            List<Case_Detail__c> officerDetails = [
                SELECT Current_Officer__c, Date_Officer__c
                FROM Case_Detail__c
                WHERE BV_Case__c = :caseId AND RecordType.DeveloperName = 'Officer_History'
                LIMIT 1
            ];

            if (!officerDetails.isEmpty()) {
                result.put('caseOfficer', officerDetails[0].Current_Officer__c);
                result.put('allocatedDate', officerDetails[0].Date_Officer__c);
            }

            return result;
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving case summary data: ' + e.getMessage());
        }
    }
}
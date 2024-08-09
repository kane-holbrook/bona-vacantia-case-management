public with sharing class CaseOfficerController {
    @AuraEnabled(cacheable=false)
    public static Case_Detail__c getCaseDetail(String bvCaseId, String recordTypeId) {
        List<Case_Detail__c> caseDetails = [
            SELECT Id, Current_Officer__c, Previous_1__c, Previous_2__c, Previous_3__c, Date_Officer__c, Date_1_Officer__c 
            FROM Case_Detail__c 
            WHERE BV_Case__c = :bvCaseId AND RecordTypeId = :recordTypeId 
            LIMIT 1
        ];
        return caseDetails.size() > 0 ? caseDetails[0] : null;
    }
}
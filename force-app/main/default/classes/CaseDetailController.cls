public with sharing class CaseDetailController {
    @AuraEnabled(cacheable=true)
    public static Case_Detail__c getCaseDetailForBVCase(Id bvCaseId) {
        // Query the related Case_Detail__c record using the lookup to BV_Case__c
        Case_Detail__c caseDetail = [
            SELECT Id, Open_Closed__c
            FROM Case_Detail__c
            WHERE BV_Case__c = :bvCaseId
            AND Record_Type_Dev_Name__c = 'Admin_Hidden_Screen' 
            LIMIT 1
        ];
        return caseDetail;
    }
}
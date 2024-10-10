public with sharing class CaseDetailController {
    @AuraEnabled(cacheable=true)
    public static Case_Detail__c getCaseDetailForBVCase(Id bvCaseId) {
        try {
            // Query the related Case_Detail__c record using the lookup to BV_Case__c
            List<Case_Detail__c> caseDetails = [
                SELECT Id, Open_Closed__c
                FROM Case_Detail__c
                WHERE BV_Case__c = :bvCaseId
                AND Record_Type_Dev_Name__c = 'Admin_Hidden_Screen' 
                LIMIT 1
            ];
            
            // Return the case detail if found, otherwise return null
            return caseDetails.isEmpty() ? null : caseDetails[0];
        } catch (Exception e) {
            // Log the error and return null
            System.debug('Error in getCaseDetailForBVCase: ' + e.getMessage());
            return null;
        }
    }
}
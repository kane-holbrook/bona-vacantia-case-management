public with sharing class CaseOfficerController {
    @AuraEnabled(cacheable=true)
    public static Case_Detail__c getCaseDetail(String bvCaseId, String recordTypeId) {
        List<Case_Detail__c> caseDetails = [
            SELECT Id, Hide_From_Huel__c, Current_Officer__c, Previous_1__c, Previous_2__c, 
                   Previous_3__c, Previous_4__c, Previous_5__c, Previous_6__c, Previous_7__c, 
                   Previous_8__c, Previous_9__c, Date_Officer__c, Date_1_Officer__c, 
                   Date_2_Officer__c, Date_3_Officer__c, Date_4_Officer__c, Date_5_Officer__c, 
                   Date_6_Officer__c, Date_7_Officer__c, Date_8_Officer__c, Date_9_Officer__c, 
                   Reopened__c, Reopened_By__c, Put_Away__c, Case_Type_Code__c, Entered_By__c, 
                   Date_Entered__c, Open_Closed__c, Bv_Fais_No__c, Time_Opened__c,
                   Hod_Approval_Needed__c, Approved__c, Cleared_For_Publishing__c,
                   Completed__c, Published__c, Granted_In_Full__c, Full_Refusal__c,
                   Part_Refusal__c, Info_Held__c, Debug__c
            FROM Case_Detail__c 
            WHERE BV_Case__c = :bvCaseId AND RecordTypeId = :recordTypeId 
            LIMIT 1
        ];
        
        return caseDetails.size() > 0 ? caseDetails[0] : null;
    }
}
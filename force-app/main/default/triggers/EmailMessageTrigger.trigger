trigger EmailMessageTrigger on EmailMessage (after insert) {
    for (EmailMessage em : Trigger.new) {
        // Find the related BV_Case__c
        BV_Case__c relatedCase = [SELECT Id FROM BV_Case__c WHERE Id = :em.RelatedToId LIMIT 1];
        
        if (relatedCase != null) {
            // Create the Case_History__c record
            Case_History__c caseHistory = new Case_History__c();
            caseHistory.BV_Case__c = relatedCase.Id;
            caseHistory.Action__c = em.Subject;
            caseHistory.Details__c= em.TextBody;
            caseHistory.Case_Officer__c = UserInfo.getUserId();
            caseHistory.Date_Inserted__c = System.today();
            caseHistory.Last_updated__c = System.now();
            insert caseHistory;

            // Enqueue the Queueable job
            System.enqueueJob(new SharePointUploader(em.Id, caseHistory.Id, relatedCase.Id));
        }
    }
}
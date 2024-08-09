public class EmailMessageHandler {
    public static void handleEmailMessage(List<EmailMessage> emailMessages) {
        // Map to store related BV_Case__c records for EmailMessage
        Map<Id, BV_Case__c> caseMap = new Map<Id, BV_Case__c>();
        
        // Collect RelatedToIds for querying related BV_Case__c
        Set<Id> relatedToIds = new Set<Id>();
        for (EmailMessage em : emailMessages) {
            if (em.RelatedToId != null) {
                relatedToIds.add(em.RelatedToId);
            }
        }
        
        // Query related BV_Case__c records
        if (!relatedToIds.isEmpty()) {
            for (BV_Case__c relatedCase : [SELECT Id FROM BV_Case__c WHERE Id IN :relatedToIds]) {
                caseMap.put(relatedCase.Id, relatedCase);
            }
        }

        // List to hold Case_History__c records to be inserted
        List<Case_History__c> caseHistories = new List<Case_History__c>();
        List<Id> emailMessageIds = new List<Id>();

        for (EmailMessage em : emailMessages) {
            BV_Case__c relatedCase = caseMap.get(em.RelatedToId);
            
            if (relatedCase != null) {
                // Create the Case_History__c record
                Case_History__c caseHistory = new Case_History__c();
                caseHistory.BV_Case__c = relatedCase.Id;
                caseHistory.Action__c = em.Subject;
                caseHistory.Details__c = em.TextBody;
                caseHistory.Case_Officer__c = UserInfo.getUserId();
                caseHistory.Date_Inserted__c = System.today();
                caseHistory.Last_updated__c = System.now();
                caseHistory.EmailMessageId__c = em.Id; // Store the EmailMessage ID in the text field
                caseHistories.add(caseHistory);

                emailMessageIds.add(em.Id);
            }
        }
        
        // Insert Case_History__c records
        if (!caseHistories.isEmpty()) {
            insert caseHistories;
        }

        // Enqueue Queueable jobs for SharePointUploader with an initial retry count of 0
        if (!emailMessageIds.isEmpty()) {
            for (Case_History__c caseHistory : caseHistories) {
                try {
                    System.enqueueJob(new SharePointUploader(emailMessageIds.remove(0), caseHistory.Id, caseHistory.BV_Case__c, 0));
                } catch (Exception e) {
                    // Log the error but do not fail the entire process
                    System.debug('Error enqueuing SharePointUploader job: ' + e.getMessage());
                }
            }
        }
    }
}
public class EmailMessageTriggerHandler {
    public static void handleAfterInsertUpdate(List<EmailMessage> newEmails) {
        List<EmailSentEvent__e> events = new List<EmailSentEvent__e>();
        
        for (EmailMessage email : newEmails) {
            EmailSentEvent__e event = new EmailSentEvent__e(
                RecordId__c = email.RelatedToId,
                Subject__c = email.Subject,
                Status__c = email.Status
            );
            events.add(event);
        }
        
        if (!events.isEmpty()) {
            EventBus.publish(events);
            
            for (EmailSentEvent__e event : events) {
                System.debug('Event published with RecordId: ' + event.RecordId__c);
            }
        }
    }
}
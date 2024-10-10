public class CaseStatusChange {
    public static void handleAfterUpdate(List<Case_Detail__c> newCase){
        List<CaseStatusChange__e> events = new List<CaseStatusChange__e>();

        for (Case_Detail__c caseRecord : newCase) {
            CaseStatusChange__e event = new CaseStatusChange__e(
                RecordID__c = caseRecord.Id,
                OpenClosed__c = caseRecord.Open_Closed__c
            );
            events.add(event);
        }

        if (!events.isEmpty()) {
            EventBus.publish(events);

            for (CaseStatusChange__e event : events) {
                System.debug('Event published with RecordId: ' + event.RecordID__c);
            }
        }
    }
}
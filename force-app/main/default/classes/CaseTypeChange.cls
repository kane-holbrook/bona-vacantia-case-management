public class CaseTypeChange {
    public static void handleAfterUpdate(List<BV_Case__c> newCase){
        List<CaseTypeChangeEvent__e> events = new List<CaseTypeChangeEvent__e>();

        for (BV_Case__c caseRecord : newCase) {
            CaseTypeChangeEvent__e event = new CaseTypeChangeEvent__e(
                RecordId__c = caseRecord.Id,
                CaseType__c = caseRecord.Case_Type__c
            );
            events.add(event);
        }

        if (!events.isEmpty()) {
            EventBus.publish(events);

            for (CaseTypeChangeEvent__e event : events) {
                System.debug('Event published with RecordId: ' + event.RecordId__c);
            }
        }
    }
}
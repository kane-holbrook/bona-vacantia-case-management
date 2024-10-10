trigger CaseStatusChangeEventTrigger on Case_Detail__c (after update) {
    CaseStatusChange.handleAfterUpdate(Trigger.new);

}
trigger CaseTypeChangeEventTrigger on BV_Case__c (after update) {
    CaseTypeChange.handleAfterUpdate(Trigger.new);

}
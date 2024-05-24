trigger BV_CaseTrigger on BV_Case__c (after insert, before update) {
    if (Trigger.isAfter && Trigger.isInsert) {
        BV_CaseTriggerHandler.handleTaskCreationForNewCases(Trigger.new);
    } 
    if (Trigger.isBefore && Trigger.isUpdate) {
        BV_CaseTriggerHandler.handleTaskCreation(Trigger.new, Trigger.oldMap);
        BV_CaseTriggerHandler.handleTaskVerification(Trigger.new);
    }
}
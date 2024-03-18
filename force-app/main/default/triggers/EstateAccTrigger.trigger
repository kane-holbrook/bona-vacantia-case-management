trigger EstateAccTrigger on EstateAcc__c (after update) {
    EstateAccCalculationHandler.updateNetValue(Trigger.new, Trigger.oldMap);
}
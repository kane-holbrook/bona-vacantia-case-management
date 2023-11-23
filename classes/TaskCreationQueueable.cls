public class TaskCreationQueueable implements Queueable {
    List<BV_Case__c> newCases;
    Map<Id, BV_Case__c> oldMap;

    public TaskCreationQueueable(List<BV_Case__c> newCases, Map<Id, BV_Case__c> oldMap) {
        this.newCases = newCases;
        this.oldMap = oldMap;
    }

    public void execute(QueueableContext context) {
        BV_CaseTriggerHandler.handleTaskCreation(newCases, oldMap);
    }
}
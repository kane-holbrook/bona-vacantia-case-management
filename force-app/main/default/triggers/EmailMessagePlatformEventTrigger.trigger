trigger EmailMessagePlatformEventTrigger on EmailMessage (after insert, after update) {
    EmailMessageTriggerHandler.handleAfterInsertUpdate(Trigger.new);
}
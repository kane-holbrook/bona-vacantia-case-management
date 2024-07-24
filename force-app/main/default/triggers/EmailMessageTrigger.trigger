trigger EmailMessageTrigger on EmailMessage (after insert) {
    EmailMessageHandler.handleEmailMessage(Trigger.new);
}
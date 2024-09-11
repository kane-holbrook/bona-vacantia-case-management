@isTest
public class EmailMessageTriggerHandlerTest {
    @isTest
    static void testHandleAfterInsertUpdate() {
        // Create test data
        Case testCase = new Case(Subject = 'Test Case');
        insert testCase;
        
        EmailMessage testEmail = new EmailMessage(
            RelatedToId = testCase.Id,
            Subject = 'Test Email',
            Status = '0'
        );
        
        // Start the test
        Test.startTest();
        
        // Insert the test email to trigger the handler
        insert testEmail;
        
        // Call the handler method directly
        EmailMessageTriggerHandler.handleAfterInsertUpdate(new List<EmailMessage>{testEmail});
        
        // Stop the test and deliver the platform events
        Test.stopTest();
        
        // Verify that the platform event was published using event bus
        List<EventBusSubscriber> subscribers = [SELECT Name, Position, Retries, LastError 
                                                FROM EventBusSubscriber 
                                                WHERE Topic = 'EmailSentEvent__e'];
        
        // Assertions
        System.assertNotEquals(0, subscribers.size(), 'There should be at least one subscriber for EmailSentEvent__e');
        
        // Check if any subscriber has processed the event
        Boolean eventProcessed = false;
        for (EventBusSubscriber subscriber : subscribers) {
            if (subscriber.Position > 0) {
                eventProcessed = true;
                break;
            }
        }
        
        System.assert(eventProcessed, 'At least one subscriber should have processed the event');
        
        // Additional assertions can be added here if needed
    }
}
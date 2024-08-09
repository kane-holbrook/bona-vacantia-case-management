public class SharePointUploader implements Queueable, Database.AllowsCallouts {
    private Id emailMessageId;
    private Id caseHistoryId;
    private Id caseId;
    private Integer retryCount;
    private static final Integer MAX_RETRY_COUNT = 5; // Define a maximum number of retries
    private static final Integer DELAY_IN_SECONDS = 10; // Delay between retries in seconds

    // Constructor with three parameters, defaulting retryCount to 0
    public SharePointUploader(Id emailMessageId, Id caseHistoryId, Id caseId) {
        this(emailMessageId, caseHistoryId, caseId, 0);
    }

    // Constructor with four parameters
    public SharePointUploader(Id emailMessageId, Id caseHistoryId, Id caseId, Integer retryCount) {
        this.emailMessageId = emailMessageId;
        this.caseHistoryId = caseHistoryId;
        this.caseId = caseId;
        this.retryCount = retryCount == null ? 0 : retryCount; // Initialize retryCount if null
    }

    public void execute(QueueableContext context) {
        Boolean attachmentsProcessed = FileControllerGraph.handleEmailAttachments(emailMessageId, caseHistoryId, caseId);

        if (!attachmentsProcessed && retryCount < MAX_RETRY_COUNT) {
            // Schedule the next retry using the Schedulable class
            Datetime nextRunTime = System.now().addSeconds(DELAY_IN_SECONDS);
            String cronExpression = nextRunTime.format('s m H d M \'?\' yyyy');
            SharePointUploaderScheduler scheduler = new SharePointUploaderScheduler(emailMessageId, caseHistoryId, caseId, retryCount + 1);
            System.schedule('SharePointUploaderRetry' + System.currentTimeMillis(), cronExpression, scheduler);
        } else if (!attachmentsProcessed) {
            // Optionally, log that no attachments were found after retries
            System.debug('No attachments found for EmailMessageId: ' + emailMessageId + ' after ' + retryCount + ' retries.');
        }
    }
}
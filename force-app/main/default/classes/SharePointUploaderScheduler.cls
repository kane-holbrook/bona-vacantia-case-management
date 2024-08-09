public class SharePointUploaderScheduler implements Schedulable {
    private Id emailMessageId;
    private Id caseHistoryId;
    private Id caseId;
    private Integer retryCount;

    public SharePointUploaderScheduler(Id emailMessageId, Id caseHistoryId, Id caseId, Integer retryCount) {
        this.emailMessageId = emailMessageId;
        this.caseHistoryId = caseHistoryId;
        this.caseId = caseId;
        this.retryCount = retryCount;
    }

    public void execute(SchedulableContext context) {
        System.enqueueJob(new SharePointUploader(emailMessageId, caseHistoryId, caseId, retryCount));
    }
}
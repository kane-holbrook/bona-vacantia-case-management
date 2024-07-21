public class SharePointUploader implements Queueable, Database.AllowsCallouts {
    private Id emailMessageId;
    private Id caseHistoryId;
    private Id caseId;

    public SharePointUploader(Id emailMessageId, Id caseHistoryId, Id caseId) {
        this.emailMessageId = emailMessageId;
        this.caseHistoryId = caseHistoryId;
        this.caseId = caseId;
    }

    public void execute(QueueableContext context) {
        FileController.handleEmailAttachments(emailMessageId, caseHistoryId, caseId);
    }
}
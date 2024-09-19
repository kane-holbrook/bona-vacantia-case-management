public class TaskRedirectController {
    private ApexPages.StandardController stdController;
    public BV_Task__c task { get; set; }

    public TaskRedirectController(ApexPages.StandardController controller) {
        this.stdController = controller;

        // Ensure the BV_Case_Lookup__c field is queried before accessing the record
        controller.addFields(new List<String>{'BV_Case_Lookup__c'});

        this.task = (BV_Task__c)controller.getRecord();
    }

    public PageReference redirectToCase() {
        if (task.BV_Case_Lookup__c != null) {
            Id caseId = task.BV_Case_Lookup__c;
            String url = '/lightning/r/BV_Case__c/' + caseId + '/view?c__taskId=' + task.Id;
            PageReference casePage = new PageReference(url);
            casePage.setRedirect(false);
            return casePage;
        } else {
            ApexPages.addMessage(new ApexPages.Message(ApexPages.Severity.ERROR, 'No related case found.'));
            return null;
        }
    }
}
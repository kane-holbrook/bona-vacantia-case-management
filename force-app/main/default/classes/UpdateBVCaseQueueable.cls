public class UpdateBVCaseQueueable implements Queueable {
    private List<Map<String, Object>> sosCaseData;

    public UpdateBVCaseQueueable(List<Map<String, Object>> sosCaseData) {
        this.sosCaseData = sosCaseData;
    }

    public void execute(QueueableContext context) {
        List<BV_Case__c> casesToUpdate = new List<BV_Case__c>();

        for (Map<String, Object> caseData : sosCaseData) {
            Id caseId = (Id) caseData.get('caseId');
            String clcode = (String) caseData.get('clcode');
            String mtcode = (String) caseData.get('mtcode');

            // Fetch the BV_Case__c record
            BV_Case__c caseRecord = [SELECT Id FROM BV_Case__c WHERE Id = :caseId LIMIT 1];
            caseRecord.clcode__c = clcode;
            caseRecord.mtcode__c = mtcode;
            casesToUpdate.add(caseRecord);
        }

        // Perform the DML update operation
        update casesToUpdate;
    }
}
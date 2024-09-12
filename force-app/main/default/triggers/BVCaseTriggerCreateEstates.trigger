trigger BVCaseTriggerCreateEstates on BV_Case__c (after insert) {
    // Query for the ESTA RecordTypeId
    Id estaRecordTypeId = Schema.SObjectType.BV_Case__c.getRecordTypeInfosByDeveloperName().get('ESTA').getRecordTypeId();
    
    // Querying for EstateAccruals related to the newly created BV_Cases with RecordType ESTA
    List<Id> caseIds = new List<Id>();
    for (BV_Case__c caseRecord : Trigger.new) {
        if (caseRecord.RecordTypeId == estaRecordTypeId) {
            caseIds.add(caseRecord.Id);
        }
    }
    
    if (caseIds.isEmpty()) {
        return; // Exit if no ESTA record types are found
    }

    List<BV_Case__c> casesWithAccruals = [SELECT Id, (SELECT Id FROM EstateAccruals__r) FROM BV_Case__c WHERE Id IN :caseIds];

    // Preparing to delete existing EstateAccruals
    List<EstateAcc__c> estateAccsToDelete = new List<EstateAcc__c>();
    for (BV_Case__c caseRecord : casesWithAccruals) {
        estateAccsToDelete.addAll(caseRecord.EstateAccruals__r);
    }
    if (!estateAccsToDelete.isEmpty()) {
        delete estateAccsToDelete;
    }

    // Insert new EstateAcc, Asset, and Liability records
    List<EstateAcc__c> estateAccsToInsert = new List<EstateAcc__c>();
    for (Id caseId : caseIds) {
        estateAccsToInsert.add(new EstateAcc__c(BV_Case__c = caseId));
    }
    insert estateAccsToInsert;

    // Preparing to create Asset and Liability records
    List<Asset__c> assetsToInsert = new List<Asset__c>();
    List<Liability__c> liabilitiesToInsert = new List<Liability__c>();

    for (EstateAcc__c estateAcc : estateAccsToInsert) {
        for (Integer i = 0; i < 20; i++) {
            assetsToInsert.add(new Asset__c(Estate_and_Accrual__c = estateAcc.Id));
            liabilitiesToInsert.add(new Liability__c(Estate_and_Accrual__c = estateAcc.Id));
        }
    }

    // Inserting Assets and Liabilities
    if (!assetsToInsert.isEmpty()) {
        insert assetsToInsert;
    }
    if (!liabilitiesToInsert.isEmpty()) {
        insert liabilitiesToInsert;
    }
}
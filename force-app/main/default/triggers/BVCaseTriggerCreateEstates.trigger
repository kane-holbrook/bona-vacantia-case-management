trigger BVCaseTriggerCreateEstates on BV_Case__c (after insert) {
    // Querying for EstateAccruals related to the newly created BV_Cases
    List<Id> caseIds = new List<Id>();
    for (BV_Case__c caseRecord : Trigger.new) {
        caseIds.add(caseRecord.Id);
    }
    List<BV_Case__c> casesWithAccruals = [SELECT Id, (SELECT Id FROM EstateAccruals__r) FROM BV_Case__c WHERE Id IN :caseIds];

    // Preparing to delete existing EstateAccruals
    List<EstateAcc__c> estateAccsToDelete = new List<EstateAcc__c>();
    for (BV_Case__c caseRecord : casesWithAccruals) {
        for (EstateAcc__c estateAcc : caseRecord.EstateAccruals__r) {
            estateAccsToDelete.add(estateAcc);
        }
    }
    delete estateAccsToDelete;

    // Insert new EstateAcc, Asset, and Liability records
    List<EstateAcc__c> estateAccsToInsert = new List<EstateAcc__c>();
    for (BV_Case__c caseRecord : Trigger.new) {
        estateAccsToInsert.add(new EstateAcc__c(BV_Case__c = caseRecord.Id));
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
    insert assetsToInsert;
    insert liabilitiesToInsert;
}
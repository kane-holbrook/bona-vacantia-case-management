@isTest
private class AssetLiabilitiesControllerTest {

    @isTest
    static void testGetAssetsLiabilitiesGrouped() {
        // Create a BV_Case__c record for test assignment
        BV_Case__c bvCase = new BV_Case__c(
            Name = 'Test BV Case'
        );
        insert bvCase;

        // Create test data
        RecordType rt = [SELECT Id, Name FROM RecordType WHERE SObjectType = 'AssetLiability__c' LIMIT 1];
        AssetLiability__c assetLiability = new AssetLiability__c(
            RecordTypeId = rt.Id,
            // Assign the BV_Case__c record Id to the required field
            BV_Case__c = bvCase.Id
        );
        insert assetLiability;

        // Query the Name field along with other necessary fields
        assetLiability = [SELECT Id, Name FROM AssetLiability__c WHERE Id = :assetLiability.Id];

        // Call the method to test
        Test.startTest();
        List<AssetLiabilitiesController.RecordTypeGroup> groupedRecords = AssetLiabilitiesController.getAssetsLiabilitiesGrouped();
        Test.stopTest();

        // Assert the results
        System.assertEquals(1, groupedRecords.size());
        System.assertEquals(rt.Name, groupedRecords[0].recordTypeName); // Corrected assertion
        System.assertEquals(1, groupedRecords[0].records.size());
        System.assertEquals('AL100000', groupedRecords[0].records[0].Title__c);
    }

    @isTest
    static void testGetAssetLiabilityDetail() {
        // Create a BV_Case__c record for test assignment
        BV_Case__c bvCase = new BV_Case__c(
            Name = 'Test BV Case'
        );
        insert bvCase;

        // Create test data
        AssetLiability__c assetLiability = new AssetLiability__c(
            // Assign the BV_Case__c record Id to the required field
            BV_Case__c = bvCase.Id
        );
        insert assetLiability;

        // Query the Name field along with other necessary fields
        assetLiability = [SELECT Id, Name FROM AssetLiability__c WHERE Id = :assetLiability.Id];

        // Call the method to test
        Test.startTest();
        AssetLiability__c result = AssetLiabilitiesController.getAssetLiabilityDetail(assetLiability.Id);
        Test.stopTest();

        // Assert the results
        System.assertEquals('AL100000', result.Name);
    }
}
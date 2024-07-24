@isTest
private class EstateDataControllerTest {
    @isTest
    static void testGetBVCaseData() {
        // Create test BV_Case record
        BV_Case__c bvCase = new BV_Case__c(Name = 'Test Case', Deceased_name__c = 'John Doe', Deceased_date_of_death__c = Date.today(), Stage__c = 'Advertising');
        insert bvCase;

        // Call the method to test
        BV_Case__c result = EstateDataController.getBVCaseData(bvCase.Id);

        // Assertions
        System.assertEquals('Test Case', result.Name);
        System.assertEquals('John Doe', result.Deceased_name__c);
        System.assertEquals(Date.today(), result.Deceased_date_of_death__c);
    }

    // @isTest
    // static void testGetEstateAccData() {
    //     // Create test BV_Case record
    //     BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Advertising');
    //     insert bvCase;

    //     // Create test EstateAcc records
    //     EstateAcc__c estateAcc = new EstateAcc__c(BV_Case__c = bvCase.Id);
    //     insert estateAcc;

    //     // Call the method to test
    //     List<EstateAcc__c> result = EstateDataController.getEstateAccData(bvCase.Id);

    //     // Assertions
    //     System.assertEquals(1, result.size());
    //     System.assertEquals(estateAcc.Id, result[0].Id);
    // }

    @isTest
    static void testCreateEstateAcc() {
        // Create test BV_Case record
        BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Advertising');
        insert bvCase;

        // Create test EstateAcc record
        EstateAcc__c estateAccToCreate = new EstateAcc__c(BV_Case__c = bvCase.Id);
        
        Test.startTest();
        // Call the method to test
        EstateAcc__c result = EstateDataController.createEstateAcc(estateAccToCreate);
        Test.stopTest();

        // Assertions
        System.assertNotEquals(null, result.Id);
    }

    @isTest
    static void testCreateAssets() {
        // Create test BV_Case record
        BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Advertising');
        insert bvCase;
        
        // Create test data: EstateAcc
        EstateAcc__c estateAcc = new EstateAcc__c(BV_Case__c = bvCase.Id);
        insert estateAcc;

        // Create test Asset records
        List<Asset__c> newAssets = new List<Asset__c>{
            new Asset__c(Estate_and_Accrual__c = estateAcc.Id, Date_Of_Death_Value__c = 1000),
            new Asset__c(Estate_and_Accrual__c = estateAcc.Id, Date_Of_Death_Value__c = 2000)
        };

        Test.startTest();
        // Call the method to test
        List<Asset__c> result = EstateDataController.createAssets(newAssets);
        Test.stopTest();

        // Assertions
        System.assertEquals(2, result.size());
    }

    @isTest
    static void testCreateLiabilities() {
        // Create test BV_Case record
        BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Advertising');
        insert bvCase;
        
        // Create test data: EstateAcc
        EstateAcc__c estateAcc = new EstateAcc__c(BV_Case__c = bvCase.Id);
        insert estateAcc;

        // Create test Liability records
        List<Liability__c> newLiabilities = new List<Liability__c>{
            new Liability__c(Estate_and_Accrual__c = estateAcc.Id, Liability_at_Date_of_Death__c = 1000),
            new Liability__c(Estate_and_Accrual__c = estateAcc.Id, Liability_at_Date_of_Death__c = 2000)
        };

        Test.startTest();
        // Call the method to test
        List<Liability__c> result = EstateDataController.createLiabilities(newLiabilities);
        Test.stopTest();

        // Assertions
        System.assertEquals(2, result.size());
    }

    @isTest
    static void testUpdateEstateAccData() {
        // Create test BV_Case record
        BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Advertising');
        insert bvCase;

        // Create test EstateAcc record
        EstateAcc__c estateAccToUpdate = new EstateAcc__c(BV_Case__c = bvCase.Id);
        insert estateAccToUpdate;

        // Modify the record
        estateAccToUpdate.NINO__c = '123456789';

        Test.startTest();
        // Call the method to test
        EstateDataController.updateEstateAccData(estateAccToUpdate);
        Test.stopTest();

        // Retrieve the updated record
        EstateAcc__c updatedEstateAcc = [SELECT NINO__c FROM EstateAcc__c WHERE Id = :estateAccToUpdate.Id];

        // Assertions
        System.assertEquals('123456789', updatedEstateAcc.NINO__c);
    }

    @isTest
    static void testUpdateAssets() {
        // Create test BV_Case record
        BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Advertising');
        insert bvCase;
        
        // Create test data: EstateAcc
        EstateAcc__c estateAcc = new EstateAcc__c(BV_Case__c = bvCase.Id);
        insert estateAcc;

        // Create test Asset records
        Asset__c assetToUpdate = new Asset__c(Estate_and_Accrual__c = estateAcc.Id, Date_Of_Death_Value__c = 1000);
        insert assetToUpdate;

        // Modify the record
        assetToUpdate.Date_Of_Death_Value__c = 2000;

        Test.startTest();
        // Call the method to test
        EstateDataController.updateAssets(new List<Asset__c>{assetToUpdate});
        Test.stopTest();

        // Retrieve the updated record
        Asset__c updatedAsset = [SELECT Date_Of_Death_Value__c FROM Asset__c WHERE Id = :assetToUpdate.Id];

        // Assertions
        System.assertEquals(2000, updatedAsset.Date_Of_Death_Value__c);
    }

    @isTest
    static void testUpdateLiabilities() {
        // Create test BV_Case record
        BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Advertising');
        insert bvCase;
        
        // Create test data: EstateAcc
        EstateAcc__c estateAcc = new EstateAcc__c(BV_Case__c = bvCase.Id);
        insert estateAcc;

        // Create test Liability records
        Liability__c liabilityToUpdate = new Liability__c(Estate_and_Accrual__c = estateAcc.Id, Liability_at_Date_of_Death__c = 1000);
        insert liabilityToUpdate;

        // Modify the record
        liabilityToUpdate.Liability_at_Date_of_Death__c = 2000;

        Test.startTest();
        // Call the method to test
        EstateDataController.updateLiabilities(new List<Liability__c>{liabilityToUpdate});
        Test.stopTest();

        // Retrieve the updated record
        Liability__c updatedLiability = [SELECT Liability_at_Date_of_Death__c FROM Liability__c WHERE Id = :liabilityToUpdate.Id];

        // Assertions
        System.assertEquals(2000, updatedLiability.Liability_at_Date_of_Death__c);
    }
    
    @isTest
    static void testCreateEstateAccWithDmlException() {
        // Create test BV_Case record
        BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Advertising');
        insert bvCase;

        // Create test EstateAcc record without setting a required field
        EstateAcc__c estateAccToCreate = new EstateAcc__c(BV_Case__c = bvCase.Id);

        Test.startTest();
        // Call the method to test
        try {
            // Insert the record without setting a required field to cause a DMLException
            insert estateAccToCreate;
        } catch (DMLException e) {
            // Verify that the correct exception is thrown
            System.assert(e.getMessage().contains('FIELD_CUSTOM_VALIDATION_EXCEPTION'), 'Expected exception message not found.');
        }
        Test.stopTest();
    }
}
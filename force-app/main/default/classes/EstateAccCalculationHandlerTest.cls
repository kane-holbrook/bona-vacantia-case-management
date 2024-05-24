@isTest
public class EstateAccCalculationHandlerTest {
    @isTest
    static void testUpdateNetValue() {
        // Create test data: BV_Case
        BV_Case__c bvCase = new BV_Case__c(Stage__c = 'Advertising');
        insert bvCase;
        
        // Create test data: EstateAcc
        EstateAcc__c estateAcc = new EstateAcc__c(BV_Case__c = bvCase.Id);
        insert estateAcc;

        // Create test data: Asset
        Asset__c asset = new Asset__c(Estate_and_Accrual__c = estateAcc.Id, Date_Of_Death_Value__c = 2000);
        insert asset;
        
        // Create test data: Liability
        Liability__c liability = new Liability__c(Estate_and_Accrual__c = estateAcc.Id, Liability_at_Date_of_Death__c = 1000);
        insert liability;
        
        // Mock old values
        Map<Id, EstateAcc__c> oldEstateAccMap = new Map<Id, EstateAcc__c>{estateAcc.Id => estateAcc.clone()};
        
        // Modify values to trigger update
        asset.Date_Of_Death_Value__c = 3000;
        liability.Liability_at_Date_of_Death__c = 2000;
        
        // Call the method to test
        Test.startTest();
        EstateAccCalculationHandler.updateNetValue(new List<EstateAcc__c>{estateAcc}, oldEstateAccMap);
        Test.stopTest();
        
        // Retrieve the updated record
        EstateAcc__c updatedEstateAcc = [SELECT Net_Value__c FROM EstateAcc__c WHERE Id = :estateAcc.Id];
        
        // Assertions
        System.assertEquals(asset.Date_Of_Death_Value__c - liability.Liability_at_Date_of_Death__c, updatedEstateAcc.Net_Value__c);
    }
}
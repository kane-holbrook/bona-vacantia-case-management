@IsTest
private class UnclaimedEstatesControllerTest {
    
    @TestSetup
    static void setupTestData() {
        // Create a record type for aliases
        Schema.RecordTypeInfo aliasRT = Schema.SObjectType.Case_Detail__c.getRecordTypeInfosByDeveloperName().get('Estates_Aliases');
        
        // Create test cases
        List<BV_Case__c> testCases = new List<BV_Case__c>();
        
        // Case 1: Published after Jan 7, 2013
        BV_Case__c publishedCase = new BV_Case__c(
            Name = 'TEST-001',
            Ready_For_Advertising__c = 'true',
            Approved__c = 'true',
            Date_Of_Publication__c = Date.newInstance(2013, 1, 8),
            Date_Of_Death__c = Date.today().addMonths(-6),
            Kin_Located__c = 'No',
            Will_Located__c = 'No',
            Insolvent__c = 'No',
            Case_Type__c = 'B1',
            Status__c = 'Open',
            Short_Place__c = 'London',
            Maiden_Name__c = 'Smith',
            Spouse__c = 'John Doe',
            Date_Of_Birth__c = Date.newInstance(1950, 1, 1),
            Place_Of_Birth__c = 'Manchester',
            Informant_Type__c = 'Public',
            Informant__c = 'Hospital Staff'
        );
        testCases.add(publishedCase);
        
        // Case 2: Open case with specific type
        BV_Case__c openCase = new BV_Case__c(
            Name = 'TEST-002',
            Status__c = 'Open',
            Case_Type__c = 'B2',
            Date_Adverts_Submitted__c = Date.newInstance(2013, 1, 6),
            Kin_Located__c = 'No',
            Will_Located__c = 'No',
            Insolvent__c = 'No'
        );
        testCases.add(openCase);
        
        // Case 3: Closed case
        BV_Case__c closedCase = new BV_Case__c(
            Name = 'TEST-003',
            Status__c = 'Closed',
            Case_Type__c = 'A1',
            Kin_Located__c = 'No',
            Will_Located__c = 'No',
            Insolvent__c = 'No'
        );
        testCases.add(closedCase);
        
        insert testCases;
        
        // Create Case Details
        List<Case_Detail__c> testDetails = new List<Case_Detail__c>();
        
        // Main details for published case
        testDetails.add(new Case_Detail__c(
            BV_Case__c = publishedCase.Id,
            Forenames__c = 'Jane',
            Surname__c = 'Doe',
            Paper_Date_1__c = Date.today()
        ));
        
        // Alias for published case
        testDetails.add(new Case_Detail__c(
            BV_Case__c = publishedCase.Id,
            Forenames__c = 'Janet',
            Surname__c = 'Smith',
            RecordTypeId = aliasRT.getRecordTypeId()
        ));
        
        insert testDetails;
    }
    
    @IsTest
    static void testConstructor() {
        Test.startTest();
        UnclaimedEstatesController controller = new UnclaimedEstatesController();
        Test.stopTest();
        
        System.assertNotEquals(null, controller.csvContent, 'CSV content should not be null');
        System.assert(controller.csvContent.contains('BV Reference'), 'CSV should contain header');
    }
    
    @IsTest
    static void testGenerateCSV() {
        Test.startTest();
        String csvContent = UnclaimedEstatesController.generateCSV();
        Test.stopTest();
        
        System.assertNotEquals(null, csvContent, 'CSV content should not be null');
        System.assert(csvContent.contains('TEST-001'), 'CSV should contain test case reference');
        System.assert(csvContent.contains('Jane'), 'CSV should contain test case forename');
        System.assert(csvContent.contains('Doe'), 'CSV should contain test case surname');
    }
    
    @IsTest
    static void testGenerateCSVPage() {
        Test.startTest();
        UnclaimedEstatesController controller = new UnclaimedEstatesController();
        PageReference pageRef = controller.generateCSVPage();
        Test.stopTest();
        
        System.assertEquals(null, pageRef, 'Page reference should be null to stay on same page');
        System.assertNotEquals(null, controller.csvContent, 'CSV content should not be null');
    }
    
    @IsTest
    static void testPublicationDateLogic() {
        BV_Case__c testCase = [SELECT Id FROM BV_Case__c WHERE Name = 'TEST-001' LIMIT 1];
        testCase.Date_Of_Publication__c = null;
        testCase.Date_Adverts_Submitted__c = Date.today();
        update testCase;
        
        Test.startTest();
        String csvContent = UnclaimedEstatesController.generateCSV();
        Test.stopTest();
        
        System.assert(csvContent.contains(Date.today().format()), 
            'CSV should contain today\'s date for cases with null publication date');
    }
    
    @IsTest
    static void testAliasProcessing() {
        Test.startTest();
        String csvContent = UnclaimedEstatesController.generateCSV();
        Test.stopTest();
        
        System.assert(csvContent.contains('Janet Smith'), 
            'CSV should contain alias information');
    }
    
    @IsTest
    static void testInformantProcessing() {
        BV_Case__c testCase = [SELECT Id FROM BV_Case__c WHERE Name = 'TEST-001' LIMIT 1];
        testCase.Family_Informant__c = 'Family Member';
        update testCase;
        
        Test.startTest();
        String csvContent = UnclaimedEstatesController.generateCSV();
        Test.stopTest();
        
        System.assert(csvContent.contains('Family Member'), 
            'CSV should contain family informant information');
    }
} 
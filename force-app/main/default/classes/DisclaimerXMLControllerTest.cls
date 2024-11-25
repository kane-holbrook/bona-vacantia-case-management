@isTest
private class DisclaimerXMLControllerTest {
    @TestSetup
    static void setupTestData() {
        // Create BV Case (Custom Object) with COMP record type
        RecordType compRecordType = [SELECT Id FROM RecordType 
                                   WHERE SObjectType = 'BV_Case__c' 
                                   AND DeveloperName = 'COMP' LIMIT 1];
        
        BV_Case__c bvCase = new BV_Case__c(
            RecordTypeId = compRecordType.Id,
            Date_Of_Notification__c = Date.today()
        );
        insert bvCase;
        
        // Create Case Detail record
        Case_Detail__c caseDetail = new Case_Detail__c(
            Publish__c = true,
            Completed__c = true,
            Lg__c = false,
            BV_Case__c = bvCase.Id,
            Company_Name__c = 'Test Company',
            Company_Number__c = '12345678',
            Disclaimer_Notice_Type__c = 'Test Notice'
        );
        insert caseDetail;
        
        // Create Asset/Liability record
        AssetLiability__c asset = new AssetLiability__c(
            BV_Case__c = bvCase.Id,
            Address_Desc__c = 'Test Address'
        );
        insert asset;
    }
    
    @isTest
    static void testConstructorInitialization() {
        Test.startTest();
        DisclaimerXMLController controller = new DisclaimerXMLController();
        Test.stopTest();
        
        // Verify basic properties
        System.assertNotEquals(null, controller.currentUser);
        System.assertNotEquals(null, controller.formattedCurrentDate);
        System.assertNotEquals(null, controller.formattedPubDate);
        System.assertNotEquals(null, controller.formattedCurrentDateLong);
        System.assertNotEquals(null, controller.currentTime);
        
        // Verify XML header and metadata
        System.assertEquals('<?xml version="1.0" encoding="UTF-8"?>', controller.xmlHeader);
        System.assert(controller.metadata.contains('<ukm:Metadata>'));
        
        // Verify disclaimers were loaded
        System.assertEquals(1, controller.disclaimers.size());
        
        // Verify wrapper contents
        DisclaimerXMLController.DisclaimerWrapper wrapper = controller.disclaimers[0];
        System.assertNotEquals(null, wrapper.disclaimer);
        System.assertNotEquals(null, wrapper.assetLiability);
        System.assertNotEquals(null, wrapper.formattedNotificationDate);
    }
    
    @isTest
    static void testPublicationDateCalculation() {
        Test.startTest();
        DisclaimerXMLController controller = new DisclaimerXMLController();
        Test.stopTest();
        
        // Get the current date and expected publication date
        Date currentDate = Date.today();
        Date pubDate = Date.valueOf(controller.formattedPubDate);
        
        // Verify publication date is at least 3 business days after current date
        Integer daysBetween = currentDate.daysBetween(pubDate);
        System.assert(daysBetween >= 3, 'Publication date should be at least 3 business days after current date');
        
        // Verify it's not falling on a weekend
        String dayOfWeek = DateTime.newInstance(pubDate, Time.newInstance(0,0,0,0)).format('E');
        System.assert(dayOfWeek != 'Sat' && dayOfWeek != 'Sun', 'Publication date should not fall on a weekend');
    }
    
    @isTest
    static void testRecordUpdates() {
        Test.startTest();
        DisclaimerXMLController controller = new DisclaimerXMLController();
        Test.stopTest();
        
        // Query the updated record
        Case_Detail__c updatedDetail = [SELECT Id, Lg__c, Published__c 
                                      FROM Case_Detail__c 
                                      WHERE Company_Name__c = 'Test Company' 
                                      LIMIT 1];
        
        // Verify the record was updated correctly
        System.assertEquals(true, updatedDetail.Lg__c, 'Lg__c should be set to true');
        System.assertNotEquals(null, updatedDetail.Published__c, 'Published__c should be set');
    }
    
    @isTest
    static void testNoRecordsScenario() {
        // Delete existing test data
        delete [SELECT Id FROM Case_Detail__c];
        
        Test.startTest();
        DisclaimerXMLController controller = new DisclaimerXMLController();
        Test.stopTest();
        
        // Verify empty disclaimers list
        System.assertEquals(0, controller.disclaimers.size(), 'Disclaimers list should be empty');
    }
} 
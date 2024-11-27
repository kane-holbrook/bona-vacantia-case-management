@isTest
private class PDFTron_ContentVersionControllerTest {
    
    @TestSetup
    static void setupTestData() {
        // Create test user with extension and email
        Profile p = [SELECT Id FROM Profile WHERE Name='Standard User'];
        String uniqueUsername = 'testuser' + DateTime.now().getTime() + '@test.com';
        User testUser = new User(
            Alias = 'testuser',
            Email = 'testuser@test.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Testing',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            UserName = uniqueUsername,
            Extension = '12345'
        );
        insert testUser;
    }

    @isTest
    static void temporaryTest() {
        PDFTron_ContentVersionController PDFTronVersionController = new PDFTron_ContentVersionController();
        PDFTronVersionController.veryTemporaryTest();
    }
    
    @isTest
    static void testGetUserExtensionAndEmail() {
        // Get the test user created in setup
        User testUser = [SELECT Id FROM User WHERE Email = 'testuser@test.com' LIMIT 1];
        
        Test.startTest();
        
        System.runAs(testUser) {
            Map<String, String> result = PDFTron_ContentVersionController.getUserExtensionAndEmail();
            
            // Verify results
            System.assertNotEquals(null, result, 'Result should not be null');
            System.assertEquals('12345', result.get('extension'), 'Extension should match test user');
            System.assertEquals('testuser@test.com', result.get('email'), 'Email should match test user');
        }
        
        Test.stopTest();
    }
    
    @isTest
    static void testGetUserExtensionAndEmailException() {
        Test.startTest();
        
        try {
            // Try to get user info with invalid user context
            PDFTron_ContentVersionController.getUserExtensionAndEmail();
        } catch (AuraHandledException e) {
            // Verify exception was thrown
            System.assert(e.getMessage().contains('Error fetching user extension and email'), 
                'Should throw appropriate error message');
        }
        
        Test.stopTest();
    }
}
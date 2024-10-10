@IsTest
private class BVCaseNumberHelperTest {
    // Helper method to get RecordTypeId
    private static Id getRecordTypeId(String developerName) {
        return Schema.SObjectType.BV_Case__c.getRecordTypeInfosByDeveloperName().get(developerName).getRecordTypeId();
    }

    // Helper method to get current year's last two digits
    private static String getCurrentYearSuffix() {
        return String.valueOf(Date.today().year()).right(2);
    }

    @IsTest
    static void testGetCaseNumber_FOIR() {
        String currentYear = getCurrentYearSuffix();
        // Create test data
        BV_Case__c testCase = new BV_Case__c(
            Name = 'FOIR' + currentYear + '#1',
            RecordTypeId = getRecordTypeId('FOIR'),
            Foi_No__c = '1/' + currentYear
        );
        insert testCase;

        // Call the method with 'FOIR' case type
        List<String> recordCaseType = new List<String>{'FOIR'};
        List<BVCaseNumberHelper.CaseResponse> responseList = BVCaseNumberHelper.getCaseNumber(recordCaseType);

        // Assert the response
        System.assertEquals(1, responseList.size());
        System.assertEquals('2/' + currentYear, responseList[0].FOIRCaseNumber);
        System.assertEquals('FOIR' + currentYear + '#2', responseList[0].CaseName);
    }

    @IsTest
    static void testGetCaseNumber_ESTA() {
        String currentYear = getCurrentYearSuffix();
        // Create test data
        BV_Case__c testCase = new BV_Case__c(
            Name = 'ESTA' + currentYear + '#1',
            RecordTypeId = getRecordTypeId('ESTA')
        );
        insert testCase;

        // Call the method with 'ESTA' case type
        List<String> recordCaseType = new List<String>{'ESTA'};
        List<BVCaseNumberHelper.CaseResponse> responseList = BVCaseNumberHelper.getCaseNumber(recordCaseType);

        // Assert the response
        System.assertEquals(1, responseList.size());
        System.assertEquals('ESTA' + currentYear + '#2', responseList[0].CaseName);
    }

    @IsTest
    static void testGetCaseNumber_COMP() {
        String currentYear = getCurrentYearSuffix();
        // Create test data
        BV_Case__c testCase = new BV_Case__c(
            Name = 'COMP' + currentYear + '#1',
            RecordTypeId = getRecordTypeId('COMP')
        );
        insert testCase;

        // Call the method with 'COMP' case type
        List<String> recordCaseType = new List<String>{'COMP'};
        List<BVCaseNumberHelper.CaseResponse> responseList = BVCaseNumberHelper.getCaseNumber(recordCaseType);

        // Assert the response
        System.assertEquals(1, responseList.size());
        System.assertEquals('COMP' + currentYear + '#2', responseList[0].CaseName);
    }

    @IsTest
    static void testGetCaseNumber_GENE() {
        String currentYear = getCurrentYearSuffix();
        // Create test data
        BV_Case__c testCase = new BV_Case__c(
            Name = 'GENE' + currentYear + '#1',
            RecordTypeId = getRecordTypeId('GENE')
        );
        insert testCase;

        // Call the method with 'GENE' case type
        List<String> recordCaseType = new List<String>{'GENE'};
        List<BVCaseNumberHelper.CaseResponse> responseList = BVCaseNumberHelper.getCaseNumber(recordCaseType);

        // Assert the response
        System.assertEquals(1, responseList.size());
        System.assertEquals('GENE' + currentYear + '#2', responseList[0].CaseName);
    }

    @IsTest
    static void testGetCaseNumber_CONV() {
        String currentYear = getCurrentYearSuffix();
        // Create test data
        BV_Case__c testCase = new BV_Case__c(
            Name = 'CONV' + currentYear + '#1',
            RecordTypeId = getRecordTypeId('CONV')
        );
        insert testCase;

        // Call the method with 'CONV' case type
        List<String> recordCaseType = new List<String>{'CONV'};
        List<BVCaseNumberHelper.CaseResponse> responseList = BVCaseNumberHelper.getCaseNumber(recordCaseType);

        // Assert the response
        System.assertEquals(1, responseList.size());
        System.assertEquals('CONV' + currentYear + '#2', responseList[0].CaseName);
    }

    @IsTest
    static void testGetCaseNumber_InvalidCaseType() {
        // Call the method with an invalid case type
        List<String> recordCaseType = new List<String>{'InvalidType'};
        List<BVCaseNumberHelper.CaseResponse> responseList = BVCaseNumberHelper.getCaseNumber(recordCaseType);

        // Assert the response
        System.assertEquals(0, responseList.size());
    }

    @IsTest
    static void testGetCaseNumber_NullCaseType() {
        // Call the method with a null case type
        List<String> recordCaseType = null;
        List<BVCaseNumberHelper.CaseResponse> responseList = BVCaseNumberHelper.getCaseNumber(recordCaseType);

        // Assert the response
        System.assertEquals(1, responseList.size());
        System.assertEquals('Error: Record Case Type is required', responseList[0].FOIRCaseNumber);
    }
}
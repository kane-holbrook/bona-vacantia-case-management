@IsTest
private class Section27ControllerTest {
    @TestSetup
    static void setupTestData() {
        // Create RecordType for ESTA
        RecordType estaRecordType = new RecordType(
            SObjectType = 'BV_Case__c',
            DeveloperName = 'ESTA'
        );
        
        // Create test cases
        List<BV_Case__c> testCases = new List<BV_Case__c>();
        for(Integer i = 0; i < 3; i++) {
            BV_Case__c testCase = new BV_Case__c(
                Name = '12345' + i,
                Publish__c = true,
                Check_Box__c = true,
                Lg__c = false,
                Date_Of_Death__c = Date.today().addMonths(-2),
                Status__c = 'Single',
                Maiden_Name__c = 'Test Maiden',
                Date_Of_Birth__c = Date.today().addYears(-80),
                Place_Of_Birth__c = 'Test City',
                Short_Place__c = 'Test Place',
                Surname__c = 'Test Surname ' + i,
                Forenames__c = 'Test Forename ' + i,
                Title__c = 'Mr'
            );
            testCases.add(testCase);
        }
        insert testCases;
    }
    
    @IsTest
    static void testConstructorAndContentGeneration() {
        Test.startTest();
        Section27Controller controller = new Section27Controller();
        Test.stopTest();
        
        // Verify header
        System.assertEquals('<?xml version="1.0" encoding="UTF-8"?>', controller.xlsHeader, 'XML header should be set correctly');
        
        // Verify rows were generated
        System.assertNotEquals(null, controller.xlsRows, 'XLS rows should not be null');
        System.assertEquals(21, controller.xlsRows.size(), 'Should have 21 total rows including empty rows');
        
        // Verify header row
        Section27Controller.XLSRow headerRow = controller.xlsRows[0];
        System.assertNotEquals(null, headerRow.cells, 'Header cells should not be null');
        System.assertEquals(Section27Controller.getHeaderCount(), headerRow.cells.size(), 
            'Header should have correct number of cells');
    }
    
    @IsTest
    static void testCaseDataProcessing() {
        Test.startTest();
        Section27Controller controller = new Section27Controller();
        Test.stopTest();
        
        // Get the first data row (index 1 after header row)
        Section27Controller.XLSRow dataRow = controller.xlsRows[1];
        
        // Verify specific cell values
        System.assertEquals('BV123450', getCellValue(dataRow, 'Supplier ID / BV Ref.'), 
            'BV reference should be correctly formatted');
        System.assertEquals('2904', getCellValue(dataRow, 'Notice code'), 
            'Notice code should be 2904');
        System.assertEquals('London', getCellValue(dataRow, 'Edition to place Notice in'), 
            'Edition should be London');
        
        // Verify case updates
        List<BV_Case__c> updatedCases = [
            SELECT Id, Lg__c, Completed__c, Published__c 
            FROM BV_Case__c 
            WHERE Publish__c = true AND Check_Box__c = true
        ];
        
        for(BV_Case__c caseRecord : updatedCases) {
            System.assertEquals(true, caseRecord.Lg__c, 'Lg__c should be set to true');
            System.assertEquals(Date.today(), caseRecord.Completed__c, 'Completed date should be set');
            System.assertEquals(Date.today(), caseRecord.Published__c, 'Published date should be set');
        }
    }
    
    @IsTest
    static void testEmptyRowGeneration() {
        Test.startTest();
        Section27Controller controller = new Section27Controller();
        Test.stopTest();
        
        // Verify empty rows
        for(Integer i = 4; i < controller.xlsRows.size(); i++) {
            Section27Controller.XLSRow emptyRow = controller.xlsRows[i];
            for(Section27Controller.XLSCell cell : emptyRow.cells) {
                System.assertEquals('', cell.value, 'Empty row cells should have empty values');
                System.assertNotEquals(null, cell.style, 'Empty row cells should have styles');
            }
        }
    }
    
    // Helper method to find cell value by header
    private static String getCellValue(Section27Controller.XLSRow row, String header) {
        // Create a list of known headers
        List<String> headers = new List<String>{
            'Supplier ID / BV Ref.',
            'Notice code',
            'Edition to place Notice in'
            // Add other headers as needed
        };
        Integer headerIndex = headers.indexOf(header);
        return row.cells[headerIndex].value;
    }
} 
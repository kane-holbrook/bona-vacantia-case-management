public with sharing class UnclaimedEstatesController {
    public String csvContent { get; private set; }

    public UnclaimedEstatesController() {
        csvContent = generateCSVContent();
    }

    @AuraEnabled
    public static String generateCSV() {
        return generateCSVContent();
    }

    public PageReference generateCSVPage() {
        csvContent = generateCSVContent();
        return null; // Return null to stay on the same page
    }

    public static String generateCSVContent() {
        // Define the CSV header
        String csvHeader = 'BV Reference,Date of Publication,Forename,Surname,Date of Death,Place of Death,Maiden Name,Marital Status,Spouse,Date of Birth,Place of Birth,Aliases,Date of Marriage,Place of Marriage,Nationality,Religion,Date Entered UK,Date of Naturalisation,Date of Adoption,Date of Divorce,Kin or Other Details,Informant,Executors\n';
        
        // Query the necessary data from BV_Case__c
        List<BV_Case__c> cases = [
            SELECT Id, Name, Ready_For_Advertising__c, Approved__c, Date_Of_Publication__c, Date_Of_Death__c,
                   Aliases__c, Kin_Details__c, Family_Informant__c, Executors__c,
                   Family_Marital_Status__c, Spouse__c, Family_Date_Of_Birth__c, Family_Place_Of_Birth__c,
                   Date_Of_Marriage__c, Place_Of_Marriage__c, Nationality__c, Religion__c, Date_Entered_Uk__c,
                   Date_Of_Naturalisation__c, Date_Of_Adoption__c, Date_Divorced__c
            FROM BV_Case__c
            WHERE Kin_Located__c != 'Yes' AND Will_Located__c != 'Yes' AND Insolvent__c != 'Yes'
            AND RecordType.DeveloperName = 'ESTA'
        ];
        
        // Query related Case_Detail__c records
        Map<Id, Case_Detail__c> caseDetailsMap = new Map<Id, Case_Detail__c>();
        for (Case_Detail__c detail : [
            SELECT BV_Case__c, Forenames__c, Surname__c, Paper_Date_1__c
            FROM Case_Detail__c
            WHERE BV_Case__c IN :cases
        ]) {
            caseDetailsMap.put(detail.BV_Case__c, detail);
        }
        
        // Initialize CSV content with the header
        String csvContent = csvHeader;
        
        // Process each case and append to CSV content
        for (BV_Case__c caseRecord : cases) {
            Case_Detail__c detail = caseDetailsMap.get(caseRecord.Id);
            String csvRow = String.join(new List<String>{
                caseRecord.Name,
                formatDate(caseRecord.Date_Of_Publication__c),
                detail != null ? detail.Forenames__c : '',
                detail != null ? detail.Surname__c : '',
                formatDate(caseRecord.Date_Of_Death__c),
                '', // Place of Death not specified in mapping
                '', // Maiden Name not specified in mapping
                caseRecord.Family_Marital_Status__c,
                caseRecord.Spouse__c,
                formatDate(caseRecord.Family_Date_Of_Birth__c),
                caseRecord.Family_Place_Of_Birth__c,
                caseRecord.Aliases__c,
                formatDate(caseRecord.Date_Of_Marriage__c),
                caseRecord.Place_Of_Marriage__c,
                caseRecord.Nationality__c,
                caseRecord.Religion__c,
                formatDate(caseRecord.Date_Entered_Uk__c),
                formatDate(caseRecord.Date_Of_Naturalisation__c),
                formatDate(caseRecord.Date_Of_Adoption__c),
                formatDate(caseRecord.Date_Divorced__c),
                caseRecord.Kin_Details__c,
                caseRecord.Family_Informant__c,
                caseRecord.Executors__c
            }, ',') + '\n';
            
            csvContent += csvRow;
        }
        
        // Return the CSV content
        return csvContent;
    }
    
    private static String formatDate(Date originalDate) {
        return originalDate != null ? originalDate.format() : '';
    }
}
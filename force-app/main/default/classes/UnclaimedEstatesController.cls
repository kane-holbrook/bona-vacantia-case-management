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
        
        // First get cases with Paper_Date_1__c
        Set<Id> casesWithPaperDates = new Set<Id>();
        for(Case_Detail__c detail : [SELECT BV_Case__c FROM Case_Detail__c WHERE Paper_Date_1__c != null]) {
            casesWithPaperDates.add(detail.BV_Case__c);
        }
        
        // Query the necessary data from BV_Case__c
        List<BV_Case__c> cases = [
            SELECT Id, Name, Ready_For_Advertising__c, Approved__c, Date_Of_Publication__c, Date_Of_Death__c,
                   Aliases__c, Kin_Details__c, Family_Informant__c, Executors__c, Case_Type__c,
                   Spouse__c, Letters_Of_Admin__c, Limitation_Date__c, Date_Adverts_Submitted__c,
                   Date_Of_Marriage__c, Place_Of_Marriage__c, Nationality__c, Religion__c, Date_Entered_Uk__c,
                   Date_Of_Naturalisation__c, Date_Of_Adoption__c, Date_Divorced__c, Maiden_Name__c, 
                   Short_Place__c, Status__c, Date_Of_Birth__c, Place_Of_Birth__c, Lapsed_Share__c
            FROM BV_Case__c
            WHERE Kin_Located__c != 'Yes' 
            AND Will_Located__c != 'Yes' 
            AND Insolvent__c != 'Yes'
            AND RecordType.DeveloperName = 'ESTA'
            AND (
                // Category 1: Published on or after Jan 7, 2013
                (Date_Of_Publication__c >= 2013-01-07 AND Ready_For_Advertising__c = 'true' AND Approved__c = 'true')
                OR
                // Category 2: Open cases with specific types
                (Status__c = 'Open' AND 
                 (Case_Type__c LIKE 'B%' OR Case_Type__c LIKE 'C1%' OR Case_Type__c LIKE 'D%' 
                  OR Case_Type__c LIKE 'D1%' OR Case_Type__c LIKE 'D2%' OR Case_Type__c LIKE 'D3%' 
                  OR Case_Type__c LIKE 'F%' OR Case_Type__c LIKE 'Y%')
                 AND (Date_Adverts_Submitted__c < 2013-01-07 OR Letters_Of_Admin__c = 'Y' 
                      OR Id IN :casesWithPaperDates))
                OR
                // Category 3: Closed cases with specific types
                (Status__c = 'Closed' AND 
                 (Case_Type__c LIKE 'A%' OR Case_Type__c LIKE 'B%' OR Case_Type__c LIKE 'C%' 
                  OR Case_Type__c LIKE 'D%' OR Case_Type__c LIKE 'J%' OR Case_Type__c LIKE 'Y%' 
                  OR Case_Type__c LIKE 'F%'))
                OR
                // Category 4: Historic cases
                (Case_Type__c LIKE 'P%')
            )
        ];
        
        // Query related Case_Detail__c records
        Map<Id, Case_Detail__c> caseDetailsMap = new Map<Id, Case_Detail__c>();
        for (Case_Detail__c detail : [
            SELECT BV_Case__c, Forenames__c, Surname__c, Paper_Date_1__c, Informant__c
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
                caseRecord.Short_Place__c,
                caseRecord.Maiden_Name__c,
                caseRecord.Status__c,
                caseRecord.Spouse__c,
                formatDate(caseRecord.Date_Of_Birth__c),
                caseRecord.Place_Of_Birth__c,
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
                getInformantInfo(caseRecord, detail),
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

    private static Boolean isWithinDateLimits(BV_Case__c caseRecord) {
        Date thirtyYearsAgo = Date.today().addYears(-30);
        
        // If neither date is set
        if (caseRecord.Limitation_Date__c == null && caseRecord.Date_Of_Death__c == null) {
            return true;
        }
        
        // If limitation date is not set but date of death is
        if (caseRecord.Limitation_Date__c == null && caseRecord.Date_Of_Death__c != null) {
            return true;
        }
        
        // If limitation date is set but date of death is not
        if (caseRecord.Limitation_Date__c != null && caseRecord.Date_Of_Death__c == null) {
            return true;
        }
        
        // If date of death is within last 30 years and limitation period hasn't passed
        if (caseRecord.Limitation_Date__c >= Date.today() && caseRecord.Date_Of_Death__c < thirtyYearsAgo) {
            return true;
        }
        
        // If limitation hasn't passed and death date is in future
        if (caseRecord.Limitation_Date__c >= Date.today() && caseRecord.Date_Of_Death__c > thirtyYearsAgo) {
            return true;
        }
        
        // If limitation has passed but death is within 30 years
        if (caseRecord.Limitation_Date__c <= Date.today() && caseRecord.Date_Of_Death__c > thirtyYearsAgo) {
            return true;
        }
        
        return false;
    }

    private static String getInformantInfo(BV_Case__c caseRecord, Case_Detail__c detail) {
        if (caseRecord.Informant_Type__c == null && caseRecord.Family_Informant__c == null) {
            return '';
        }
        
        if (caseRecord.Informant_Type__c?.startsWith('Pub') && caseRecord.Family_Informant__c == null) {
            return caseRecord.Informant__c;
        }
        
        if (caseRecord.Informant_Type__c == null && caseRecord.Family_Informant__c != null) {
            return caseRecord.Family_Informant__c;
        }
        
        if (caseRecord.Informant_Type__c != null && caseRecord.Family_Informant__c != null) {
            return caseRecord.Family_Informant__c;
        }
        
        if (caseRecord.Informant_Type__c?.startsWith('UD')) {
            return caseRecord.Family_Informant__c != null ? caseRecord.Family_Informant__c : '';
        }
        
        return '';
    }
}
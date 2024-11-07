public with sharing class Section27Controller {
    public String csvContent { get; private set; }

    public Section27Controller() {
        csvContent = generateCSVContent();
    }

    @AuraEnabled
    public static String generateCSV() {
        return generateCSVContent();
    }

    public PageReference generateCSVPage() {
        csvContent = generateCSVContent();
        return null;
    }

    public static String generateCSVContent() {
        // Define the CSV header
        String csvHeader = 'Supplier ID/BV Reference,Notice code,Edition to place Notice in,Earliest publication date,' +
            'Claim expiry date,PO Box Forwarding,PDF Voucher Copy,Print Voucher Copy,Notice Logo,Surname of the Deceased,' +
            'First Name of the Deceased,Middle name(s) of the Deceased,Title of the Deceased,Deceased Post Nominal Award,' +
            'Marital Status,Maiden name of the Deceased,Place of Marriage,Date of marriage,Spouse,Date of birth,Place of birth,' +
            'Nationality,Religion,Alternative name the Deceased was known by (1),Alternative name the Deceased was known by (2),' +
            'Alternative name the Deceased was known by (3),Date of Death,OR Between the date of,and the date of,Place of Death,' +
            'Deceased\'s Occupation,Date Entered UK,Date of Naturalisation,Date of Adoption,Date of Divorce,Kin or Other Details,' +
            'Any other information,Last Address of Deceased-Line 1,Last Addressof Deceased-Line 2,Last Address of Deceased-Town,' +
            'Last Address of Deceased-County,Last Address of Deceased-Country,Last Address of Deceased-Postcode,Informant,Executors,' +
            'Persons claims are made to - Surname,Persons claims are made to First name,Persons claims are made to - Middle name(s),' +
            'Persons claims are made to Address 1,Persons claims are made to-Address 2,Persons claims are made to - Town,' +
            'Persons claims are made to-County,Persons claims are made to - Country,Persons claims are made to - Postcode,' +
            'Persons claims are made to - Telephone,Persons claims are made to Fax,Persons claims are made to - Email,' +
            'Persons claims are made to - Reference Number\n';

        // Query BV Cases ready for Section 27
        List<BV_Case__c> cases = [
            SELECT Id, Name, Publish__c, Check_Box__c, Lg__c, Date_Of_Death__c,
                   Status__c, Maiden_Name__c, Date_Of_Birth__c, Place_Of_Birth__c, 
                   Short_Place__c, Surname__c, Forenames__c, Title__c
            FROM BV_Case__c
            WHERE RecordType.DeveloperName = 'ESTA'
            AND Publish__c = true
            AND Check_Box__c = true
            AND Lg__c = false
        ];

        String csvContent = csvHeader;
        Date today = Date.today();

        for (BV_Case__c caseRecord : cases) {
            String csvRow = String.join(new List<String>{
                'BV' + caseRecord.Name, // Supplier ID/BV Reference
                '2904', // Notice code
                'London', // Edition to place Notice in
                formatDate(today), // Earliest publication date
                '', // Claim expiry date
                'No', // PO Box Forwarding
                'No', // PDF Voucher Copy
                'No', // Print Voucher Copy
                '', // Notice Logo
                caseRecord.Surname__c ?? '', // EST01 - Surname
                caseRecord.Forenames__c ?? '', // EST02 - Forenames
                '', // Middle name(s)
                caseRecord.Title__c ?? '', // EST03 - Title
                '', // Post Nominal Award
                caseRecord.Status__c ?? '', // EST04 - Status
                caseRecord.Maiden_Name__c ?? '', // EST05 - Maiden Name
                '', // Place of Marriage
                '', // Date of marriage
                '', // Spouse
                formatDate(caseRecord.Date_Of_Birth__c), // EST15 - DoB
                caseRecord.Place_Of_Birth__c ?? '', // EST16 - Born at
                '', // Nationality
                '', // Religion
                '', // Alternative name 1
                '', // Alternative name 2
                '', // Alternative name 3
                formatDate(caseRecord.Date_Of_Death__c), // EST06 - Died
                '', // OR Between the date of
                '', // and the date of
                caseRecord.Short_Place__c ?? '', // EST14 - Short Place
                '', // Deceased's Occupation
                '', // Date Entered UK
                '', // Date of Naturalisation
                '', // Date of Adoption
                '', // Date of Divorce
                '', // Kin or Other Details
                '', // Any other information
                '', // Address Line 1
                '', // Address Line 2
                '', // Town
                '', // County
                '', // Country
                '', // Postcode
                '', // Informant
                '', // Executors
                'Government Legal Department (BV)', // Claims made to - Surname
                '', // Claims made to - First name
                '', // Claims made to - Middle name
                'PO BOX 70165', // Claims made to - Address 1
                '', // Claims made to - Address 2
                'London', // Claims made to - Town
                '', // Claims made to - County
                '', // Claims made to - Country
                'WC1A 9HG', // Claims made to - Postcode
                '0207 210 4700', // Claims made to - Telephone
                '', // Claims made to - Fax
                'bvestates@governmentlegal.gov.uk', // Claims made to - Email
                'BV' + caseRecord.Name // Claims made to - Reference Number
            }, ',') + '\n';
            
            csvContent += csvRow;
        }
        
        return csvContent;
    }
    
    private static String formatDate(Date originalDate) {
        return originalDate != null ? originalDate.format() : '';
    }
}
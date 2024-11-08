public with sharing class Section27Controller {
    public String xlsHeader { get; private set; }
    public List<XLSRow> xlsRows { get; private set; }
    
    private static final Map<String, String> HEADER_STYLES = new Map<String, String>{
        'Supplier ID / BV Ref.' => 'orange',
        'Notice code' => 'orange',
        'Edition to place Notice in' => 'orange',
        'Earliest publication date' => 'orange',
        'Claim expiry date' => 'orange',
        'PO Box Forwarding' => 'orange',
        'PDF Voucher Copy' => 'orange',
        'Print Voucher Copy' => 'orange',
        'Notice Logo' => 'orange',
        'Surname of the Deceased' => 'blue',
        'First Name of the Deceased' => 'blue',
        'Middle name(s) of the Deceased' => 'blue',
        'Title of the Deceased' => 'blue',
        'Deceased Post Nominal Award' => 'blue',
        'Marital Status' => 'blue',
        'Maiden name of the Deceased' => 'blue',
        'Place of Marriage' => 'blue',
        'Date of Marriage' => 'blue',
        'Spouse' => 'blue',
        'Date of birth' => 'blue',
        'Place of birth' => 'blue',
        'Nationality' => 'blue',
        'Religion' => 'blue',
        'Alternative name the Deceased was known by (1)' => 'blue',
        'Alternative name the Deceased was known by (2)' => 'blue',
        'Alternative name the Deceased was known by (3)' => 'blue',
        'Date of Death' => 'blue',
        'OR Between the date of' => 'blue',
        'and the date of' => 'blue',
        'Place of Death' => 'blue',
        'Deceased\'s Occupation' => 'blue',
        'Date Entered UK' => 'blue',
        'Date of Naturalisation' => 'blue',
        'Date of Adoption' => 'blue',
        'Date of Divorce' => 'blue',
        'Kin or Other Details' => 'blue',
        'Any other information' => 'blue',
        'Last Address of Deceased - Line 1' => 'orange',
        'Last Address of Deceased - Line 2' => 'orange',
        'Last Address of Deceased - Town' => 'orange',
        'Last Address of Deceased - County' => 'orange',
        'Last Address of Deceased - Country' => 'orange',
        'Last Address of Deceased - Postcode' => 'orange',
        'Informant' => 'blue',
        'Executors' => 'blue',
        'Persons claims are made to - Surname' => 'blue',
        'Persons claims are made to - First Name' => 'blue',
        'Persons claims are made to - Middle name(s)' => 'blue',
        'Persons claims are made to - Address 1' => 'blue',
        'Persons claims are made to - Address 2' => 'blue',
        'Persons claims are made to - Town' => 'blue',
        'Persons claims are made to - County' => 'blue',
        'Persons claims are made to - Country' => 'blue',
        'Persons claims are made to - Postcode' => 'blue',
        'Persons claims are made to - Telephone' => 'orange',
        'Persons claims are made to - Fax' => 'orange',
        'Persons claims are made to - Email' => 'orange',
        'Persons claims are made to - Reference Number' => 'orange',
        'Previous Address of Deceased (1) - Line 1' => 'orange',
        'Previous Address of Deceased (1) - Line 2' => 'orange',
        'Previous Address of Deceased (1) - Town' => 'orange',
        'Previous Address of Deceased (1) - County' => 'orange',
        'Previous Address of Deceased (1) - Country' => 'orange',
        'Previous Address of Deceased (1) - Postcode' => 'orange',
        'Previous Address of Deceased (2) - Line 1' => 'blue',
        'Previous Address of Deceased (2) - Line 2' => 'blue',
        'Previous Address of Deceased (2) - Town' => 'blue',
        'Previous Address of Deceased (2) - County' => 'blue',
        'Previous Address of Deceased (2) - Country' => 'blue',
        'Previous Address of Deceased (2) - Postcode' => 'blue'
    };

    private static final Map<String, String> DATA_ROW_STYLES = new Map<String, String>{
        'Supplier ID / BV Ref.' => 'lightGreen',
        'Notice code' => 'lightYellow',
        'Edition to place Notice in' => 'lightYellow',
        'Earliest publication date' => 'lightYellow',
        'Claim expiry date' => 'lightYellow',
        'PO Box Forwarding' => 'lightGreen',
        'PDF Voucher Copy' => 'lightGreen',
        'Print Voucher Copy' => 'lightGreen',
        'Notice Logo' => 'lightGreen',
        'Surname of the Deceased' => 'lightYellow',
        'First Name of the Deceased' => 'lightYellow',
        'Middle name(s) of the Deceased' => 'lightGreen',
        'Title of the Deceased' => 'lightGreen',
        'Deceased Post Nominal Award' => 'lightGreen',
        'Marital Status' => 'lightGreen',
        'Maiden name of the Deceased' => 'lightGreen',
        'Place of Marriage' => 'lightGreen',
        'Date of Marriage' => 'lightGreen',
        'Spouse' => 'lightGreen',
        'Date of birth' => 'lightGreen',
        'Place of birth' => 'lightGreen',
        'Nationality' => 'lightGreen',
        'Religion' => 'lightGreen',
        'Alternative name the Deceased was known by (1)' => 'lightGreen',
        'Alternative name the Deceased was known by (2)' => 'lightGreen',
        'Alternative name the Deceased was known by (3)' => 'lightGreen',
        'Date of Death' => 'lightYellow',
        'OR Between the date of' => 'lightGreen',
        'and the date of' => 'lightGreen',
        'Place of Death' => 'lightGreen',
        'Deceased\'s Occupation' => 'lightGreen',
        'Date Entered UK' => 'lightGreen',
        'Date of Naturalisation' => 'lightGreen',
        'Date of Adoption' => 'lightGreen',
        'Date of Divorce' => 'lightGreen',
        'Kin or Other Details' => 'lightGreen',
        'Any other information' => 'lightGreen',
        'Last Address of Deceased - Line 1' => 'lightGreen',
        'Last Address of Deceased - Line 2' => 'lightGreen',
        'Last Address of Deceased - Town' => 'lightGreen',
        'Last Address of Deceased - County' => 'lightGreen',
        'Last Address of Deceased - Country' => 'lightGreen',
        'Last Address of Deceased - Postcode' => 'lightGreen',
        'Informant' => 'lightGreen',
        'Executors' => 'lightYellow',
        'Persons claims are made to - Surname' => 'lightYellow',
        'Persons claims are made to - First Name' => 'lightYellow',
        'Persons claims are made to - Middle name(s)' => 'lightGreen',
        'Persons claims are made to - Address 1' => 'lightYellow',
        'Persons claims are made to - Address 2' => 'lightGreen',
        'Persons claims are made to - Town' => 'lightYellow',
        'Persons claims are made to - County' => 'lightGreen',
        'Persons claims are made to - Country' => 'lightGreen',
        'Persons claims are made to - Postcode' => 'lightGreen',
        'Persons claims are made to - Telephone' => 'lightGreen',
        'Persons claims are made to - Fax' => 'lightGreen',
        'Persons claims are made to - Email' => 'lightGreen',
        'Persons claims are made to - Reference Number' => 'lightGreen',
        'Previous Address of Deceased (1) - Line 1' => 'lightGreen',
        'Previous Address of Deceased (1) - Line 2' => 'lightGreen',
        'Previous Address of Deceased (1) - Town' => 'lightGreen',
        'Previous Address of Deceased (1) - County' => 'lightGreen',
        'Previous Address of Deceased (1) - Country' => 'lightGreen',
        'Previous Address of Deceased (1) - Postcode' => 'lightGreen',
        'Previous Address of Deceased (2) - Line 1' => 'lightGreen',
        'Previous Address of Deceased (2) - Line 2' => 'lightGreen',
        'Previous Address of Deceased (2) - Town' => 'lightGreen',
        'Previous Address of Deceased (2) - County' => 'lightGreen',
        'Previous Address of Deceased (2) - Country' => 'lightGreen',
        'Previous Address of Deceased (2) - Postcode' => 'lightGreen'
    };
    
    public class XLSCell {
        public String value { get; set; }
        public String style { get; set; }
        
        public XLSCell(String value, String style) {
            this.value = value;
            this.style = style;
        }
    }
    
    public class XLSRow {
        public List<XLSCell> cells { get; set; }
        
        public XLSRow() {
            this.cells = new List<XLSCell>();
        }
    }
    
    public Section27Controller() {
        xlsHeader = '<?xml version="1.0" encoding="UTF-8"?>';
        generateXLSContent();
    }
    
    private void generateXLSContent() {
        xlsRows = new List<XLSRow>();
        
        // Header row
        XLSRow headerRow = new XLSRow();
        for(String header : DATA_ROW_STYLES.keySet()) {
            String style = HEADER_STYLES.containsKey(header) ? HEADER_STYLES.get(header) : 'blue';
            addHeaderCell(headerRow, header, style);
        }
        xlsRows.add(headerRow);
        
        // Query BV Cases
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
        
        // Data rows
        for(BV_Case__c caseRecord : cases) {
            XLSRow dataRow = new XLSRow();
            
            for(String header : DATA_ROW_STYLES.keySet()) {
                String value = getCaseValue(caseRecord, header);
                addDataCell(dataRow, value, DATA_ROW_STYLES.get(header));
            }
            
            xlsRows.add(dataRow);
        }
    }
    
    private String getCaseValue(BV_Case__c caseRecord, String field) {
        switch on field {
            when 'Supplier ID / BV Ref.' {
                return 'BV' + caseRecord.Name;
            }
            when 'Notice code' {
                return '2904';
            }
            when 'Edition to place Notice in' {
                return 'London';
            }
            when 'Surname of the Deceased' {
                return caseRecord.Surname__c;
            }
            when 'First Name of the Deceased' {
                return caseRecord.Forenames__c;
            }
            when 'Title of the Deceased' {
                return caseRecord.Title__c;
            }
            when 'Marital Status' {
                return caseRecord.Status__c;
            }
            when 'Maiden name of the Deceased' {
                return caseRecord.Maiden_Name__c;
            }
            when 'Date of birth' {
                return formatDate(caseRecord.Date_Of_Birth__c);
            }
            when 'Place of birth' {
                return caseRecord.Place_Of_Birth__c;
            }
            when 'Date of Death' {
                return formatDate(caseRecord.Date_Of_Death__c);
            }
            when 'Place of Death' {
                return caseRecord.Short_Place__c;
            }
            when 'Persons claims are made to - Surname' {
                return 'Government Legal Department (BV)';
            }
            when 'Persons claims are made to - Address 1' {
                return 'PO BOX 70165';
            }
            when 'Persons claims are made to - Town' {
                return 'London';
            }
            when 'Persons claims are made to - Postcode' {
                return 'WC1A 9HG';
            }
            when 'Persons claims are made to - Telephone' {
                return '0207 210 4700';
            }
            when 'Persons claims are made to - Email' {
                return 'bvestates@governmentlegal.gov.uk';
            }
            when 'Persons claims are made to - Reference Number' {
                return 'BV' + caseRecord.Name;
            }
            when else {
                return '';
            }
        }
    }
    
    private void addHeaderCell(XLSRow row, String value, String style) {
        row.cells.add(new XLSCell(value, style));
    }
    
    private void addDataCell(XLSRow row, String value, String style) {
        row.cells.add(new XLSCell(value != null ? value : '', style));
    }
    
    private String formatDate(Date d) {
        return d != null ? d.format() : '';
    }
}
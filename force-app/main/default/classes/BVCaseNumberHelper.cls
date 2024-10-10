public class BVCaseNumberHelper {
    @InvocableMethod(label='Generate Case Number' description='Generates the next case number')
    public static List<CaseResponse> getCaseNumber(List<String> RecordCaseType) {
        List<CaseResponse> responseList = new List<CaseResponse>();
        String newCaseName;
        String currentYear = String.valueOf(Date.today().year()).right(2);

        // Query last 100 cases for FOIR Case Name
        List<BV_Case__c> CaseNameList = [SELECT Name FROM BV_Case__c 
                                            ORDER BY CreatedDate DESC 
                                            LIMIT 100];

        if(RecordCaseType == null || RecordCaseType.isEmpty()) {
            CaseResponse errorResponse = new CaseResponse();
            errorResponse.FOIRCaseNumber = 'Error: Record Case Type is required';
            responseList.add(errorResponse);
            return responseList;
        } else if (RecordCaseType.contains('FOIR')) {
            // Query the last 100 cases, sorted by CreatedDate descending
            List<BV_Case__c> FOIRCases = [SELECT Foi_No__c FROM BV_Case__c
                                            WHERE Record_Type_Dev_Name__c = 'FOIR' 
                                            ORDER BY CreatedDate DESC 
                                            LIMIT 100];

            // Initialize default values
            String newFOIRNumber;

            // Determine FOIR Number
            if (FOIRCases.isEmpty() || FOIRCases[0].Foi_No__c == null) {
                newFOIRNumber = '1/' + currentYear; // Starting FOIR number: "1/YY"
            } else {
                String lastFOIRNumber = FOIRCases[0].Foi_No__c;
                List<String> FOIRNumberParts = lastFOIRNumber.split('/');
                if (FOIRNumberParts.size() == 2) {
                    Integer firstPart = Integer.valueOf(FOIRNumberParts[0]) + 1;
                    newFOIRNumber = firstPart + '/' + currentYear; // Increment FOIR number
                } else {
                    CaseResponse errorResponse = new CaseResponse();
                    errorResponse.FOIRCaseNumber = 'Error: Invalid FOIR Number Format';
                    responseList.add(errorResponse);
                    return responseList;
                }
            }

            // Determine Case Name
            if (CaseNameList.isEmpty() || CaseNameList[0].Name == null) {
                newCaseName = 'FOIR' + currentYear + '#1'; // Starting case name: "TYPEYY#1"
            } else {
                String lastCaseName = CaseNameList[0].Name;
                List<String> NameParts = lastCaseName.split('#');
                if (NameParts.size() == 2) {
                    Integer lastID = Integer.valueOf(NameParts[1]) + 1;
                    newCaseName = 'FOIR' + currentYear + '#' + lastID; // Increment  case name
                } else {
                    CaseResponse errorResponse = new CaseResponse();
                    errorResponse.CaseName = 'Error: Invalid Case Name Format';
                    responseList.add(errorResponse);
                    return responseList;
                }
            }

            // Add both FOIRNumber and CaseName to the response
            CaseResponse caseResponse = new CaseResponse();
            caseResponse.FOIRCaseNumber = newFOIRNumber;
            caseResponse.CaseName = newCaseName;
            responseList.add(caseResponse);

            return responseList;
        }else if (RecordCaseType.contains('ESTA')){
            if (CaseNameList.isEmpty() || CaseNameList[0].Name == null) {
                newCaseName = 'ESTA' + currentYear + '#1'; // Starting case name: "TYPEYY#1"
            } else {
                String lastCaseName = CaseNameList[0].Name;
                List<String> NameParts = lastCaseName.split('#');
                if (NameParts.size() == 2) {
                    Integer lastID = Integer.valueOf(NameParts[1]) + 1;
                    newCaseName = 'ESTA' + currentYear + '#' + lastID; // Increment  case name
                } else {
                    CaseResponse errorResponse = new CaseResponse();
                    errorResponse.CaseName = 'Error: Invalid Case Name Format';
                    responseList.add(errorResponse);
                    return responseList;
                }
            }

            CaseResponse caseResponse = new CaseResponse();
            caseResponse.CaseName = newCaseName;
            responseList.add(caseResponse);

            return responseList;

        }else if (RecordCaseType.contains('COMP')){
            if (CaseNameList.isEmpty() || CaseNameList[0].Name == null) {
                newCaseName = 'COMP' + currentYear + '#1'; // Starting case name: "TYPEYY#1"
            } else {
                String lastCaseName = CaseNameList[0].Name;
                List<String> NameParts = lastCaseName.split('#');
                if (NameParts.size() == 2) {
                    Integer lastID = Integer.valueOf(NameParts[1]) + 1;
                    newCaseName = 'COMP' + currentYear + '#' + lastID; // Increment  case name
                } else {
                    CaseResponse errorResponse = new CaseResponse();
                    errorResponse.CaseName = 'Error: Invalid Case Name Format';
                    responseList.add(errorResponse);
                    return responseList;
                }
            }

            CaseResponse caseResponse = new CaseResponse();
            caseResponse.CaseName = newCaseName;
            responseList.add(caseResponse);

            return responseList;

        }else if (RecordCaseType.contains('GENE')){
            if (CaseNameList.isEmpty() || CaseNameList[0].Name == null) {
                newCaseName = 'GENE' + currentYear + '#1'; // Starting case name: "TYPEYY#1"
            } else {
                String lastCaseName = CaseNameList[0].Name;
                List<String> NameParts = lastCaseName.split('#');
                if (NameParts.size() == 2) {
                    Integer lastID = Integer.valueOf(NameParts[1]) + 1;
                    newCaseName = 'GENE' + currentYear + '#' + lastID; // Increment  case name
                } else {
                    CaseResponse errorResponse = new CaseResponse();
                    errorResponse.CaseName = 'Error: Invalid Case Name Format';
                    responseList.add(errorResponse);
                    return responseList;
                }
            }

            CaseResponse caseResponse = new CaseResponse();
            caseResponse.CaseName = newCaseName;
            responseList.add(caseResponse);

            return responseList;

        } else if (RecordCaseType.contains('CONV')){
            if (CaseNameList.isEmpty() || CaseNameList[0].Name == null) {
                newCaseName = 'CONV' + currentYear + '#1'; // Starting case name: "TYPEYY#1"
            } else {
                String lastCaseName = CaseNameList[0].Name;
                List<String> NameParts = lastCaseName.split('#');
                if (NameParts.size() == 2) {
                    Integer lastID = Integer.valueOf(NameParts[1]) + 1;
                    newCaseName = 'CONV' + currentYear + '#' + lastID; // Increment  case name
                } else {
                    CaseResponse errorResponse = new CaseResponse();
                    errorResponse.CaseName = 'Error: Invalid Case Name Format';
                    responseList.add(errorResponse);
                    return responseList;
                }
            }

            CaseResponse caseResponse = new CaseResponse();
            caseResponse.CaseName = newCaseName;
            responseList.add(caseResponse);

            return responseList;

        }

        // Return an empty list if the case type is not 'FOIR'
        return responseList;
    }

    // CaseResponse class to hold both FOIR Case Number and Case Name
    public class CaseResponse {
        @InvocableVariable(required=false description='Case Name')
        public String CaseName;

        @InvocableVariable(required=false description='FOIR Case Number')
        public String FOIRCaseNumber;
    }
}
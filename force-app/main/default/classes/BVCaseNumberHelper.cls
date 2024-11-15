public class BVCaseNumberHelper {
    @InvocableMethod(label='Generate Case Number' description='Generates the next case number')
    public static List<CaseResponse> getCaseNumber(List<String> RecordCaseType) {
        List<CaseResponse> responseList = new List<CaseResponse>();
        String newCaseName;
        String currentYear = String.valueOf(Date.today().year()).right(2);
        Pattern caseNamePattern = Pattern.compile('^(FOIR|ESTA|COMP|GENE|CONV)\\d{2}#\\d+/\\d+$');

        // Query last 100 cases for FOIR Case Name
        List<BV_Case__c> CaseNameList = [SELECT Name FROM BV_Case__c 
                                            ORDER BY CreatedDate DESC 
                                            LIMIT 100];

        if(RecordCaseType == null || RecordCaseType.isEmpty()) {
            CaseResponse errorResponse = new CaseResponse();
            responseList.add(errorResponse);
            return responseList;
        } else if (RecordCaseType.contains('FOIR')) {
            // Determine Case Name
            if (CaseNameList.isEmpty() || CaseNameList[0].Name == null || !caseNamePattern.matcher(CaseNameList[0].Name).matches()) {
                newCaseName = 'FOIR' + currentYear + '#1/1'; // Starting case name: "TYPEYY#1"
            } else {
                String lastCaseName = CaseNameList[0].Name;
                List<String> nameParts = lastCaseName.split('#|/');
                if (NameParts.size() == 3) {
                    String lastYear = NameParts[0].substring(NameParts[0].length() - 2);
                    Integer lastID = (lastYear == currentYear) ? Integer.valueOf(NameParts[1]) + 1 : 1;
                    newCaseName = 'FOIR' + currentYear + '#' + lastID + '/1'; // Increment  case name
                } else {
                    CaseResponse errorResponse = new CaseResponse();
                    errorResponse.CaseName = 'Error: Invalid Case Name Format';
                    responseList.add(errorResponse);
                    return responseList;
                }
            }

            // Add both FOIRNumber and CaseName to the response
            CaseResponse caseResponse = new CaseResponse();
            caseResponse.CaseName = newCaseName;
            responseList.add(caseResponse);

            return responseList;
        }else if (RecordCaseType.contains('ESTA')){
            if (CaseNameList.isEmpty() || CaseNameList[0].Name == null || !caseNamePattern.matcher(CaseNameList[0].Name).matches()) {
                newCaseName = 'ESTA' + currentYear + '#1/1'; // Starting case name: "TYPEYY#1"
            } else {
                String lastCaseName = CaseNameList[0].Name;
                List<String> nameParts = lastCaseName.split('#|/');
                if (NameParts.size() == 3) {
                    String lastYear = NameParts[0].substring(NameParts[0].length() - 2);
                    Integer lastID = (lastYear == currentYear) ? Integer.valueOf(NameParts[1]) + 1 : 1;
                    newCaseName = 'ESTA' + currentYear + '#' + lastID + '/1'; // Increment  case name
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
            if (CaseNameList.isEmpty() || CaseNameList[0].Name == null || !caseNamePattern.matcher(CaseNameList[0].Name).matches()) {
                newCaseName = 'COMP' + currentYear + '#1/1'; // Starting case name: "TYPEYY#1"
            } else {
                String lastCaseName = CaseNameList[0].Name;
                List<String> nameParts = lastCaseName.split('#|/');
                if (NameParts.size() == 3) {
                    String lastYear = NameParts[0].substring(NameParts[0].length() - 2);
                    Integer lastID = (lastYear == currentYear) ? Integer.valueOf(NameParts[1]) + 1 : 1;
                    newCaseName = 'COMP' + currentYear + '#' + lastID + '/1'; // Increment  case name
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
            if (CaseNameList.isEmpty() || CaseNameList[0].Name == null || !caseNamePattern.matcher(CaseNameList[0].Name).matches()) {
                newCaseName = 'GENE' + currentYear + '#1/1'; // Starting case name: "TYPEYY#1"
            } else {
                String lastCaseName = CaseNameList[0].Name;
                List<String> nameParts = lastCaseName.split('#|/');
                if (NameParts.size() == 3) {
                    String lastYear = NameParts[0].substring(NameParts[0].length() - 2);
                    Integer lastID = (lastYear == currentYear) ? Integer.valueOf(NameParts[1]) + 1 : 1;
                    newCaseName = 'GENE' + currentYear + '#' + lastID + '/1'; // Increment  case name
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
    }
}
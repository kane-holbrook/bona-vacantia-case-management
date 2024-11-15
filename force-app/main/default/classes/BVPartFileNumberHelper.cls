public class BVPartFileNumberHelper {
    @InvocableMethod(label='Generate Part File Case Number' description='Generates the next Part File case number')
    public static List<CaseResponse> getPartFileNumber(List<String> RecordCaseName) {
        List<CaseResponse> responseList = new List<CaseResponse>();
        String newCaseName;
        String currentYear = String.valueOf(Date.today().year()).right(2);
        Pattern caseNamePattern = Pattern.compile('^(FOIR|ESTA|COMP|GENE|CONV)\\d{2}#\\d+/\\d+$');
        Pattern legacyNamePattern = Pattern.compile('^\\d+/\\d+$');

        // Query last 100 cases
        List<BV_Case__c> CaseNameList = [SELECT Name FROM BV_Case__c 
                                         ORDER BY CreatedDate DESC 
                                         LIMIT 100];

        if (RecordCaseName == null || RecordCaseName.isEmpty()) {
            CaseResponse errorResponse = new CaseResponse();
            responseList.add(errorResponse);
            return responseList;
        }
        String lastCaseName = CaseNameList[0].Name;
        String inputCaseName = RecordCaseName[0];

        if (CaseNameList.isEmpty() || CaseNameList[0].Name == null || (!caseNamePattern.matcher(lastCaseName).matches() && !legacyNamePattern.matcher(lastCaseName).matches())) {
            // Starting case name: "CONVYY#1/1"
            newCaseName = 'CONV' + currentYear + '#1/1';
        } else {
            if (inputCaseName.contains('COMP')) {
                // Handle COMP case to only increment the part number
                List<String> nameParts = inputCaseName.split('#|/'); // Split COMPYY#ID/PN into parts
                
                if (nameParts.size() == 3) { // Ensure we have PREFIXYY, ID, and PN
                    String prefixPart = nameParts[0] + '#' + nameParts[1];
                    Integer partNumber = Integer.valueOf(nameParts[2]) + 1; // Increment only the part number
                    newCaseName = prefixPart + '/' + partNumber;
                } else {
                    CaseResponse errorResponse = new CaseResponse();
                    errorResponse.CaseName = 'Error: Invalid Case Name Format for COMP';
                    responseList.add(errorResponse);
                    return responseList;
                }
            } else {
                // For non-CONV case names, follow the adjusted logic to handle /PN
                List<String> nameParts = lastCaseName.split('#|/');
                
                if (nameParts.size() == 3) { // Ensure we have three parts: PREFIXYY, ID, and PN
                    String lastYear = nameParts[0].substring(nameParts[0].length() - 2);
                    Integer lastID = (lastYear == currentYear) ? Integer.valueOf(nameParts[1]) + 1 : 1;
                    
                    // Start the part number at 1 for a new non-CONV case, as it's a new sequence
                    newCaseName = 'CONV' + currentYear + '#' + lastID + '/1';
                } else {
                    CaseResponse errorResponse = new CaseResponse();
                    errorResponse.CaseName = 'Error: Invalid Case Name Format';
                    responseList.add(errorResponse);
                    return responseList;
                }
            }            
        }
        

        CaseResponse caseResponse = new CaseResponse();
        caseResponse.CaseName = newCaseName;
        responseList.add(caseResponse);

        return responseList;
    }

    public class CaseResponse {
        @InvocableVariable(required=false description='Conveyance Case Name')
        public String CaseName;
    }
}
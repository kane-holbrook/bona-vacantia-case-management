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
        String prefixPartOne = RecordCaseName[0].split('/')[0]; // Extract the prefix before '/PN'

        System.debug('prefixPartOne: ' + prefixPartOne);

        // Query cases with the same prefix (TYPEYY#ID) to find all related part files
        List<BV_Case__c> matchingCases = [
            SELECT Name 
            FROM BV_Case__c 
            WHERE Name LIKE :prefixPartOne + '/%' 
            ORDER BY CreatedDate DESC 
        ];

        Integer maxPartNumber = 0;
        String maxPartCaseName = ''; // Track the name with the highest part number

        System.debug('matchingCases: ' + matchingCases);

        for (BV_Case__c matchingCase : matchingCases) {
            String[] nameParts = matchingCase.Name.split('/');
            if (nameParts.size() == 2) {
                Integer partNumber = Integer.valueOf(nameParts[1]);
                if (partNumber > maxPartNumber) {
                    maxPartNumber = partNumber;
                    maxPartCaseName = matchingCase.Name; // Store the name of the case with the highest part number
                }
            }
        }

        System.debug('maxPartCaseName: ' + maxPartCaseName);

        // Update inputCaseName to the case with the highest part number
        String inputCaseName = maxPartCaseName;

        System.debug('inputCaseName: ' + inputCaseName);


        if (CaseNameList.isEmpty() || CaseNameList[0].Name == null || (!caseNamePattern.matcher(lastCaseName).matches() && !legacyNamePattern.matcher(lastCaseName).matches())) {
            // Starting case name: "CONVYY#1/1"
            // newCaseName = 'CONV' + currentYear + '#1/1';
        } else {
            if (inputCaseName.contains('COMP') || inputCaseName.contains('ESTA')) {
                // Handle COMP or ESTA case to only increment the part number
                List<String> nameParts = inputCaseName.split('#|/'); // Split TYPEYY#ID/PN into parts
                
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
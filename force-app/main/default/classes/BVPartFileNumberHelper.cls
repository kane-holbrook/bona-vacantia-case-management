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

        String inputCaseName = RecordCaseName[0];
        Boolean isLegacyCase = legacyNamePattern.matcher(inputCaseName).matches();
        
        if (isLegacyCase) {
            // Handle legacy case format (e.g., 2000543/7)
            List<String> nameParts = inputCaseName.split('/');
            if (nameParts.size() == 2) {
                String baseNumber = nameParts[0];
                Integer partNumber = Integer.valueOf(nameParts[1]) + 1;
                newCaseName = baseNumber + '/' + partNumber;
            } else {
                CaseResponse errorResponse = new CaseResponse();
                errorResponse.CaseName = 'Error: Invalid Legacy Case Name Format';
                responseList.add(errorResponse);
                return responseList;
            }
        } else {
            // Existing modern case handling logic
            String prefixPartOne = inputCaseName.split('/')[0];
            
            List<BV_Case__c> matchingCases = [
                SELECT Name 
                FROM BV_Case__c 
                WHERE Name LIKE :prefixPartOne + '/%' 
                ORDER BY CreatedDate DESC 
            ];

            Integer maxPartNumber = 0;
            String maxPartCaseName = '';

            for (BV_Case__c matchingCase : matchingCases) {
                String[] nameParts = matchingCase.Name.split('/');
                if (nameParts.size() == 2) {
                    Integer partNumber = Integer.valueOf(nameParts[1]);
                    if (partNumber > maxPartNumber) {
                        maxPartNumber = partNumber;
                        maxPartCaseName = matchingCase.Name;
                    }
                }
            }

            if (maxPartCaseName != '') {
                inputCaseName = maxPartCaseName;
            }

            // Only handle COMP and ESTA cases for part files
            if (inputCaseName.contains('COMP') || inputCaseName.contains('ESTA')) {
                List<String> nameParts = inputCaseName.split('#|/');
                
                if (nameParts.size() == 3) {
                    String prefixPart = nameParts[0] + '#' + nameParts[1];
                    Integer partNumber = Integer.valueOf(nameParts[2]) + 1;
                    newCaseName = prefixPart + '/' + partNumber;
                } else {
                    CaseResponse errorResponse = new CaseResponse();
                    errorResponse.CaseName = 'Error: Invalid Case Name Format for COMP/ESTA';
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
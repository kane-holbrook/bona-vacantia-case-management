public class BVCaseNumberHelper {
    @InvocableMethod(label='Generate Case Number' description='Generates the next case number')
    public static List<CaseResponse> getCaseNumber(List<String> RecordCaseType) {
        List<CaseResponse> responseList = new List<CaseResponse>();
        String newCaseName;
        String currentYear = String.valueOf(Date.today().year()).right(2);
        Pattern caseNamePattern = Pattern.compile('^(FOIR|ESTA|COMP|GENE|CONV)\\d{2}#\\d+/1$');

        if(RecordCaseType == null || RecordCaseType.isEmpty()) {
            responseList.add(new CaseResponse());
            return responseList;
        }

        String caseType = RecordCaseType[0];
        if (!new Set<String>{'FOIR', 'ESTA', 'COMP', 'GENE'}.contains(caseType)) {
            return responseList;
        }

        // Query only primary cases (ending in /1) for the specific case type
        List<BV_Case__c> caseNameList = [
            SELECT Name 
            FROM BV_Case__c 
            WHERE Name LIKE :caseType + '%'
            AND Name LIKE '%/1'
            AND Name LIKE :caseType + currentYear + '#%'
            ORDER BY CreatedDate DESC 
            LIMIT 1
        ];

        // Generate new case name
        if (caseNameList.isEmpty() || caseNameList[0].Name == null || 
            !caseNamePattern.matcher(caseNameList[0].Name).matches()) {
            newCaseName = caseType + currentYear + '#1/1';
        } else {
            String lastCaseName = caseNameList[0].Name;
            List<String> nameParts = lastCaseName.split('#|/');
            if (nameParts.size() == 3) {
                Integer lastID = Integer.valueOf(nameParts[1]) + 1;
                newCaseName = caseType + currentYear + '#' + lastID + '/1';
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

    public class CaseResponse {
        @InvocableVariable(required=false description='Case Name')
        public String CaseName;
    }
}
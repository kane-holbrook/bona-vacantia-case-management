public class FOIRCaseNumberHelper {
    @InvocableMethod(label='Generate FOIR Case Number' description='Generates the next FOIR case number')
    public static List<FOIRCaseResponse> getFOIRCaseNumber() {
        List<FOIRCaseResponse> responseList = new List<FOIRCaseResponse>();
        String currentYear = String.valueOf(Date.today().year()).right(2);
        
        // Query the last 100 FOIR cases
        List<BV_Case__c> FOIRCases = [SELECT Foi_No__c FROM BV_Case__c
                                      WHERE Record_Type_Dev_Name__c = 'FOIR' 
                                      ORDER BY CreatedDate DESC 
                                      LIMIT 100];
        String newFOIRNumber;

        // Determine FOIR Number
        if (FOIRCases.isEmpty() || FOIRCases[0].Foi_No__c == null) {
            newFOIRNumber = '1/' + currentYear; // Starting FOIR number: "1/YY"
        } else {
            String lastFOIRNumber = FOIRCases[0].Foi_No__c;
            List<String> FOIRNumberParts = lastFOIRNumber.split('/');
            if (FOIRNumberParts.size() == 2) {
                String lastYear = FOIRNumberParts[1];
                Integer firstPart = (lastYear == currentYear) ? Integer.valueOf(FOIRNumberParts[0]) + 1 : 1;
                newFOIRNumber = firstPart + '/' + currentYear; // Increment FOIR number
            } else {
                FOIRCaseResponse errorResponse = new FOIRCaseResponse();
                errorResponse.FOIRCaseNumber = 'Error: Invalid FOIR Number Format';
                responseList.add(errorResponse);
                return responseList;
            }
        }

        // Create response with the new FOIR number
        FOIRCaseResponse caseResponse = new FOIRCaseResponse();
        caseResponse.FOIRCaseNumber = newFOIRNumber;
        responseList.add(caseResponse);

        return responseList;
    }

    // Response class to hold FOIR Case Number
    public class FOIRCaseResponse {
        @InvocableVariable(required=false description='FOIR Case Number')
        public String FOIRCaseNumber;
    }
}
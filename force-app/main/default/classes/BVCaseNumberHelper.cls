public class BVCaseNumberHelper {

    // Make the method invocable from a Flow
    @InvocableMethod(label='Get Next Case Number' description='Generates the next case number based on the latest cases')
    public static List<String> getNextCaseNumber(List<String> request) {
        List<String> caseNumberList = new List<String>();

        // Query the last 100 cases, sorted by CreatedDate descending
        List<BV_Case__c> latestCases = [SELECT Name FROM BV_Case__c 
                                        WHERE Name LIKE '%/1' 
                                        ORDER BY CreatedDate DESC 
                                        LIMIT 100];

        System.debug('Latest Cases: ' + latestCases);

        // If there are no cases, return the first default case number
        if (latestCases.isEmpty() || latestCases[0].Name == null) {
            caseNumberList.add('1/1'); // Starting format in case there are no valid case numbers
            return caseNumberList;
        }


        // Extract the case number from the most recent case
        String lastCaseNumber = latestCases[0].Name;

        // Case number is in the format "x/1"
        List<String> caseNumberParts = lastCaseNumber.split('/');

        if (caseNumberParts.size() == 2) {
            // Parse the first part as an integer
            Integer firstPart = Integer.valueOf(caseNumberParts[0]);

            // Increment the first part by 1
            firstPart += 1;

            // Rebuild the new case number and return it
            String newCaseNumber = firstPart + '/' + caseNumberParts[1];
            caseNumberList.add(newCaseNumber);
            return caseNumberList;
        }

        // Fallback in case the case number format is incorrect
        caseNumberList.add('Error: Invalid Case Number Format');
        return caseNumberList;
    }
}
public class BVCaseNumberHelper {
    @InvocableMethod(label='Get Next FOIR Number' description='Generates the next FOIR number based on the latest FOIR Numbers')
    public static List<String> getFOIRNumber(List<String> RecordCaseType) {
        List<String> FOIRNumberList = new List<String>();

        // Query the last 100 cases, sorted by CreatedDate descending
        List<BV_Case__c> FOIRCases = [SELECT Foi_No__c FROM BV_Case__c 
                                        ORDER BY CreatedDate DESC 
                                        LIMIT 100];

        // If there are no cases, return the first default FOIR number
        if (FOIRCases.isEmpty() || FOIRCases[0].Foi_No__c == null) {
            String currentYear = String.valueOf(Date.today().year()).right(2);
            FOIRNumberList.add('1/' + currentYear); // Starting format: "1/YY"
            return FOIRNumberList;
        }


        // Extract the FOIR number from the most recent case
        String lastFOIRNumber = FOIRCases[0].Foi_No__c;

        // FOIR number is in the format "x/YY"
        List<String> FOIRNumberParts = lastFOIRNumber.split('/');

        if (FOIRNumberParts.size() == 2) {
            // Parse the first part as an integer
            Integer firstPart = Integer.valueOf(FOIRNumberParts[0]);

            // Increment the first part by 1
            firstPart += 1;

            // Get the current year and extract the last two digits
            String currentYear = String.valueOf(Date.today().year()).right(2);

            // Rebuild the new FOIR number using the updated year
            String newFOIRNumber = firstPart + '/' + currentYear;
            FOIRNumberList.add(newFOIRNumber);
            return FOIRNumberList;
        }

        // Fallback in case the case number format is incorrect
        FOIRNumberList.add('Error: Invalid Case Number Format');
        return FOIRNumberList;
    }
}
public class BVCaseNumberGenerator {

    // Method to generate a random 4-digit number as a string with leading zeros
    private static String generateRandomFOINumber() {
        Integer randomNumber = Math.round(Math.random() * 9999);
        String randomString = String.valueOf(randomNumber);

        while (randomString.length() < 4) {
            randomString = '0' + randomString;
        }

        return randomString;
    }

    // Method to generate a new FOI number
    public static String generateNewFOINumber() {
        String newFOINumber;
        Boolean uniqueFOI = false;

        while (!uniqueFOI) {
            String randomNumber = generateRandomFOINumber();
            // Query to check if the random number already exists
            List<BV_Case__c> existingCases = [SELECT Foi_No__c FROM BV_Case__c WHERE Foi_No__c LIKE :randomNumber + '/%'];

            if (existingCases.isEmpty()) {
                newFOINumber = randomNumber + '/1';
                uniqueFOI = true;
            }
        }

        return newFOINumber;
    }

    // Method to generate a follow-up or internal review FOI number
    public static String generateFollowUpFOINumber(String existingFOINumber) {
        // Query the existing follow-up numbers for the given FOI number
        List<BV_Case__c> existingCases = [SELECT Foi_No__c FROM BV_Case__c WHERE Foi_No__c LIKE :existingFOINumber + '/%' ORDER BY Foi_No__c DESC];
        
        String newFOINumber;
        if (existingCases.isEmpty()) {
            newFOINumber = existingFOINumber + '/2';
        } else {
            String lastFOINumber = existingCases[0].Foi_No__c;
            Integer lastSuffix = Integer.valueOf(lastFOINumber.split('/')[1]);
            newFOINumber = existingFOINumber + '/' + (lastSuffix + 1);
        }
        
        return newFOINumber;
    }

    // Wrapper class for Invocable method parameters
    public class FOIRequest {
        @InvocableVariable
        public String existingFOINumber;
        @InvocableVariable
        public String requestType;
    }

    // Method to get the appropriate FOI number based on request type
    @InvocableMethod(label='Get the FOI Number' description='Get the FOI Number')
    public static List<String> getFOINumber(List<FOIRequest> requests) {
        List<String> results = new List<String>();
        System.debug(requests);

        for (FOIRequest request : requests) {
            if (request.requestType == 'New Request') {
                results.add(generateNewFOINumber());
            } else if (request.requestType == 'Follow Up' || request.requestType == 'Internal Review') {
                results.add(generateFollowUpFOINumber(request.existingFOINumber));
            } else {
                results.add(null);
            }
        }

        return results;
    }
}
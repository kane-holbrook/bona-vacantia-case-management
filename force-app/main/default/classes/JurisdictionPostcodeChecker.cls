public with sharing class JurisdictionPostcodeChecker {
    @AuraEnabled(cacheable = true)
    public static String checkPostcode(String postcode) {
        String postcodeLabel = postcode.split(' ')[0]; // Split postcode to get first part

        // Query for postcode details
        List<Jurisdiction_Postcode__mdt> postcodeDetails = [
            SELECT Id, Label, Consult_F_Co__c, Not_DOL__c 
            FROM Jurisdiction_Postcode__mdt 
            WHERE Label = :postcodeLabel 
            LIMIT 1
        ];

        // Check if postcode details are found and return message to user
        if (!postcodeDetails.isEmpty()) {
            Jurisdiction_Postcode__mdt postcodeDetail = postcodeDetails[0];
            if (postcodeDetail.Consult_F_Co__c) {
                return 'The postcode ' + postcode + ' is not within the jurisdiction of the Duchy of Lancaster. For further assistance, please contact Farrer & Co at email here';
            } else if (postcodeDetail.Not_DOL__c) {
                return 'The postcode ' + postcode + ' is marked as "Not DoL". This means it is not within the jurisdiction of the Duchy of Lancaster. Please consult with the Treasury Solicitor.';
            } else {
                return 'The postcode ' + postcode + ' is within jurisdiction.';
            }
        } else {
            return 'The postcode ' + postcode + ' is not within jurisdiction.';
        }
    }
}
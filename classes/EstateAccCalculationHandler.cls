public class EstateAccCalculationHandler {
    public static void updateNetValue(List<EstateAcc__c> updatedEstateAccs, Map<Id, EstateAcc__c> oldEstateAccMap) {
        List<EstateAcc__c> estateAccsToUpdate = new List<EstateAcc__c>();

        for (EstateAcc__c estateAcc : updatedEstateAccs) {
            EstateAcc__c oldEstateAcc = oldEstateAccMap.get(estateAcc.Id);

            if (oldEstateAcc.Date_of_Death_Summary__c != estateAcc.Date_of_Death_Summary__c || 
                oldEstateAcc.Liability_at_Date_of_Death_Summary__c != estateAcc.Liability_at_Date_of_Death_Summary__c) {
                
                // Create a new instance of EstateAcc__c for update
                EstateAcc__c estateAccToUpdate = new EstateAcc__c(Id = estateAcc.Id);
                estateAccToUpdate.Net_Value__c = estateAcc.Date_of_Death_Summary__c - estateAcc.Liability_at_Date_of_Death_Summary__c;
                estateAccsToUpdate.add(estateAccToUpdate);
            }
        }

        if (!estateAccsToUpdate.isEmpty()) {
            update estateAccsToUpdate;
        }
    }
}
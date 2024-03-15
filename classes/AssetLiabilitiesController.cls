public with sharing class AssetLiabilitiesController {
    @AuraEnabled(cacheable=true)
    public static List<RecordTypeGroup> getAssetsLiabilitiesGrouped() {
        List<RecordTypeGroup> groupedRecords = new List<RecordTypeGroup>();
        Map<Id, RecordTypeGroup> recordTypeMap = new Map<Id, RecordTypeGroup>();

        for (AssetLiability__c record : [SELECT Id, Title__c, RecordTypeId, RecordType.Name FROM AssetLiability__c]) {
            if (!recordTypeMap.containsKey(record.RecordTypeId)) {
                recordTypeMap.put(record.RecordTypeId, new RecordTypeGroup());
                recordTypeMap.get(record.RecordTypeId).recordTypeName = record.RecordType.Name;
                recordTypeMap.get(record.RecordTypeId).records = new List<AssetLiability__c>();
            }
            recordTypeMap.get(record.RecordTypeId).records.add(record);
        }

        groupedRecords.addAll(recordTypeMap.values());
        return groupedRecords;
    }

    @AuraEnabled(cacheable=true)
    public static AssetLiability__c getAssetLiabilityDetail(Id recordId) {
        // Assuming 'AssetLiability__c' has fields you want to display like 'Name__c', 'Amount__c', etc.
        return [SELECT Id, Title__c, Name FROM AssetLiability__c WHERE Id = :recordId LIMIT 1];
    }

    public class RecordTypeGroup {
        @AuraEnabled public String recordTypeName;
        @AuraEnabled public List<AssetLiability__c> records;
    }
}
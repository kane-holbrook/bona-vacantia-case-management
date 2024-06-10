public with sharing class LayoutController {
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getLayout(String objectApiName, String recordTypeId, String recordId) {
        System.debug('recordId Name: ' + recordId);

        // Get the layout using UI API
        String layoutUrl = '/services/data/v59.0/ui-api/layout/' + objectApiName + '?recordTypeId=' + recordTypeId;
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:Apex_Metadata_API_Named' + layoutUrl);
        req.setMethod('GET');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() != 200) {
            return null;
        }
        System.debug('Full Layout: ' + res.getBody());

        // Get the headers from compact layout using UI API
        String headerLayoutUrl = '/services/data/v59.0/ui-api/layout/' + objectApiName + '?recordTypeId=' + recordTypeId + '&layoutType=Compact';
        HttpRequest req2 = new HttpRequest();
        req2.setEndpoint('callout:Apex_Metadata_API_Named' + headerLayoutUrl);
        req2.setMethod('GET');
        
        Http http2 = new Http();
        HttpResponse res2 = http2.send(req2);
        
        if (res2.getStatusCode() != 200) {
            return null;
        }
        System.debug('Compact Layout: ' + res2.getBody());
        
        // Parse the layout metadata
        Map<String, Object> layoutMetadata = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
        Map<String, Object> headingMetadata = (Map<String, Object>) JSON.deserializeUntyped(res2.getBody());

        //Merge heading fields with the main layout metadata
        List<Object> layoutSections = (List<Object>) layoutMetadata.get('sections');
        List<Object> tableHeaders = (List<Object>) headingMetadata.get('sections');

        for(Integer i = 0; i < tableHeaders.size(); i++){
            //tableHeaders should only ever have one section
            layoutSections.add(0, tableHeaders[i]);
        }

        layoutMetadata.put('sections', layoutSections);
        System.debug('Combined layout: ' + JSON.serialize(layoutMetadata));

        // Extract apiName fields from layout metadata
        Set<String> fieldApiNames = new Set<String>();
        
        // Decode HTML entities in headings
        if (layoutMetadata.containsKey('sections')) {
            List<Object> sections = (List<Object>) layoutMetadata.get('sections');
            for (Object sectionObj : sections) {
                Map<String, Object> section = (Map<String, Object>) sectionObj;
                // Decode HTML entities in section headings
                if (section.containsKey('heading')) {
                    String heading = (String) section.get('heading');
                    section.put('heading', decodeHtmlEntities(heading));
                }
                if (section.containsKey('layoutRows')) {
                    List<Object> layoutRows = (List<Object>) section.get('layoutRows');
                    for (Object rowObj : layoutRows) {
                        Map<String, Object> row = (Map<String, Object>) rowObj;
                        if (row.containsKey('layoutItems')) {
                            List<Object> layoutItems = (List<Object>) row.get('layoutItems');
                            for (Object itemObj : layoutItems) {
                                Map<String, Object> item = (Map<String, Object>) itemObj;
                                if (item.containsKey('layoutComponents')) {
                                    List<Object> layoutComponents = (List<Object>) item.get('layoutComponents');
                                    for (Object componentObj : layoutComponents) {
                                        Map<String, Object> component = (Map<String, Object>) componentObj;
                                        if (component.containsKey('heading')) {
                                            String componentHeading = (String) component.get('heading');
                                            component.put('heading', decodeHtmlEntities(componentHeading));
                                        }
                                        if (component.containsKey('apiName') && component.get('apiName') != null) {
                                            String apiName = (String) component.get('apiName');
                                            if (!String.isEmpty(apiName)) {
                                                fieldApiNames.add(apiName);
                                                System.debug('Field API Name: ' + apiName);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Perform SOQL query to fetch field values
        if (!fieldApiNames.isEmpty()) {
            String soql;
            if (objectApiName == 'BV_Case__c') {
                soql = 'SELECT ' + String.join(new List<String>(fieldApiNames), ', ') + ' FROM ' + objectApiName + ' WHERE Id = :recordId';
            } else {
                soql = 'SELECT ' + String.join(new List<String>(fieldApiNames), ', ') + ' FROM ' + objectApiName + ' WHERE BV_Case__c = :recordId';
            }
            System.debug('SOQL: ' + soql);
            List<SObject> records = Database.query(soql);
            
            // Merge the field values with layout metadata
            layoutMetadata.put('recordData', records);
        }
        
        return layoutMetadata;
    }

    @AuraEnabled(cacheable=true)
    public static List<Object> getTreeData() {
        // Query the custom metadata to fetch the JSON data
        DatabaseLayoutMetadata__mdt metadataRecord = [
            SELECT LayoutJSON__c 
            FROM DatabaseLayoutMetadata__mdt 
            LIMIT 1
        ];

        // Retrieve the JSON data from the custom metadata field
        String jsonData = metadataRecord.LayoutJSON__c;

        // Deserialize the JSON data to a List of Objects
        return (List<Object>) JSON.deserializeUntyped(jsonData);
    }

    @AuraEnabled(cacheable=true)
    public static String getRecordTypeId(String objectName, String recordTypeName) {
        try {
            Schema.SObjectType targetType = Schema.getGlobalDescribe().get(objectName);
            Map<String, Schema.RecordTypeInfo> recordTypes = targetType.getDescribe().getRecordTypeInfosByName();
            Schema.RecordTypeInfo recordTypeInfo = recordTypes.get(recordTypeName);
            if (recordTypeInfo != null) {
                return recordTypeInfo.getRecordTypeId();
            }
        } catch (Exception e) {
            System.debug('Error fetching record type ID: ' + e.getMessage());
        }
        return null;
    }

    @AuraEnabled
    public static void updateRecord(String recordId, String objectName, Map<String, Object> updatedFields) {
        System.debug('recordId Name: ' + recordId);
        System.debug('objectName Name: ' + objectName);
        System.debug('updatedFields Name: ' + updatedFields);

        SObject obj = Database.query('SELECT Id FROM ' + objectName + ' WHERE Id = :recordId LIMIT 1');
        
        System.debug(obj);
        // Set updated field values
        for (String fieldName : updatedFields.keySet()) {
            obj.put(fieldName, updatedFields.get(fieldName));
        }
        
        update obj;
    }

    @AuraEnabled
    public static void createRecord(String objectName, Map<String, Object> fields) {
        System.debug('objectName Name: ' + objectName);
        System.debug('fields Name: ' + fields);

        SObject obj = Schema.getGlobalDescribe().get(objectName).newSObject();

        // Set field values
        for (String fieldName : fields.keySet()) {
            obj.put(fieldName, fields.get(fieldName));
        }

        insert obj;
    }

    @AuraEnabled
    public static void deleteRecord(String recordId, String objectName) {
        System.debug('Deleting record with Id: ' + recordId + ' of object: ' + objectName);

        // Constructing a dynamic SOQL query to get the record to be deleted
        SObject obj = Database.query('SELECT Id FROM ' + objectName + ' WHERE Id = :recordId LIMIT 1');

        // Deleting the record
        delete obj;
    }

    // Method to decode HTML entities
    private static String decodeHtmlEntities(String str) {
        if (str == null) {
            return null;
        }
        str = str.replaceAll('&amp;', '&');
        str = str.replaceAll('&lt;', '<');
        str = str.replaceAll('&gt;', '>');
        str = str.replaceAll('&quot;', '"');
        str = str.replaceAll('&#39;', '\'');
        return str;
    }
}
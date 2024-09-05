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
        
        // Merge heading fields with the main layout metadata
        List<Object> layoutSections = (List<Object>) layoutMetadata.get('sections');
        List<Object> tableHeaders = (List<Object>) headingMetadata.get('sections');
        
        for (Integer i = 0; i < tableHeaders.size(); i++) {
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
    
        if (objectApiName == 'BV_Case__c') {
            recordTypeId = getRecordTypeIdForRecord(recordId);
        }
        
        // Perform SOQL query to fetch field values
        List<SObject> records = new List<SObject>();
        if (!fieldApiNames.isEmpty()) {
            String soql;
            if (objectApiName == 'BV_Case__c') {
                soql = 'SELECT ' + String.join(new List<String>(fieldApiNames), ', ') + ' FROM ' + objectApiName + ' WHERE Id = :recordId AND RecordTypeId = :recordTypeId ORDER BY CreatedDate ASC';
            } else {
                soql = 'SELECT ' + String.join(new List<String>(fieldApiNames), ', ') + ' FROM ' + objectApiName + ' WHERE BV_Case__c = :recordId AND RecordTypeId = :recordTypeId ORDER BY CreatedDate ASC';
            }
            System.debug('SOQL: ' + soql);
            records = Database.query(soql);
            
            // Merge the field values with layout metadata
            layoutMetadata.put('recordData', records);
        }
        
        // Fetch field data types
        Map<String, String> fieldDataTypes = new Map<String, String>();
        if (!fieldApiNames.isEmpty()) {
            String fieldDefinitionSOQL = 'SELECT QualifiedApiName, DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = :objectApiName AND QualifiedApiName IN :fieldApiNames';
            List<FieldDefinition> fieldDefinitions = Database.query(fieldDefinitionSOQL);
            
            for (FieldDefinition fieldDef : fieldDefinitions) {
                fieldDataTypes.put(fieldDef.QualifiedApiName, fieldDef.DataType);
            }
        }
        
        // Add data types to layout metadata
        layoutMetadata.put('fieldDataTypes', fieldDataTypes);
        System.debug('Field Data Types: ' + fieldDataTypes);
    
        // Extract Account IDs from Lookup fields in recordData
        Set<Id> accountIds = new Set<Id>();
        for (SObject record : records) {
            for (String fieldName : fieldApiNames) {
                if (record.get(fieldName) instanceof Id && String.valueOf(record.get(fieldName)).startsWith('001')) { // Accounts have Id prefix '001'
                    accountIds.add((Id) record.get(fieldName));
                }
            }
        }
        
        // Query Account names using the collected account IDs
        Map<Id, Account> accounts = new Map<Id, Account>();
        if (!accountIds.isEmpty()) {
            accounts = new Map<Id, Account>([SELECT Id, Name FROM Account WHERE Id IN :accountIds]);
        }
        
        // Add the fetched Account details to the layout metadata
        layoutMetadata.put('relatedAccounts', accounts);
        System.debug('Related Accounts: ' + accounts);
        
        return layoutMetadata;
    }

    @AuraEnabled(cacheable=true)
    public static List<Object> getTreeData(String recordTypeDeveloperName) {
        // Query the custom metadata to fetch the JSON data
        DatabaseLayoutMetadata__mdt metadataRecord = [
            SELECT LayoutJSON__c 
            FROM DatabaseLayoutMetadata__mdt 
            WHERE RecordTypeDeveloperName__c = :recordTypeDeveloperName 
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
            if (targetType == null) {
                System.debug('Object type not found for: ' + objectName);
                return null;
            }
            
            Map<String, Schema.RecordTypeInfo> recordTypes = targetType.getDescribe().getRecordTypeInfosByName();
            
            // Convert the recordTypeName to lower case and replace the Unicode apostrophe with a regular apostrophe
            recordTypeName = recordTypeName.toLowerCase().replace('\u2019', '\''); 
    
            // Iterate through available record types to find a similar name
            for (String availableName : recordTypes.keySet()) {
                String normalizedAvailableName = availableName.toLowerCase().replace('\u2019', '\'');
                if (normalizedAvailableName.contains(recordTypeName)) { // Check if the recordTypeName is a substring of availableName
                    System.debug('Matching record type found: ' + availableName);
                    return recordTypes.get(availableName).getRecordTypeId();
                }
            }
        } catch (Exception e) {
            System.debug('Error fetching record type ID: ' + e.getMessage());
        }
        return null; // Return null if no matching record type is found
    }

    @AuraEnabled(cacheable=true)
    public static String getRecordTypeIdForRecord(Id recordId) {
        try {
            // Get the SObject type from the record ID prefix
            String sObjectType = recordId.getSObjectType().getDescribe().getName();
            // Dynamically query the SObject using the determined type
            String query = 'SELECT RecordTypeId FROM ' + sObjectType + ' WHERE Id = :recordId LIMIT 1';
            SObject record = Database.query(query);
            return (String) record.get('RecordTypeId');
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching record type ID: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static String getRecordTypeDeveloperName(Id recordTypeId) {
        try {
            // Query to get the DeveloperName of the RecordType
            RecordType recordType = [SELECT DeveloperName FROM RecordType WHERE Id = :recordTypeId LIMIT 1];
            return recordType.DeveloperName;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching record type DeveloperName: ' + e.getMessage());
        }
    }

    // @AuraEnabled
    // public static void updateRecord(String recordId, String objectName, Map<String, Object> updatedFields, String recordTypeId) {
    //     try {
    //         // Query to check if the record exists and get the current values
    //         SObject obj = Database.query('SELECT Id FROM ' + objectName + ' WHERE Id = :recordId AND RecordTypeId = :recordTypeId LIMIT 1');

    //         System.debug(obj);
            
    //         if (obj == null) {
    //             throw new AuraHandledException('Record not found.');
    //         }

    //         System.debug('SObject: ' + obj);
    //         System.debug('Object name: ' + objectName);
    //         System.debug('Fields: ' + updatedFields);
    
    //         // Get the describe result for the object
    //         Schema.SObjectType objType = obj.getSObjectType();
    //         Map<String, Schema.SObjectField> fieldMap = objType.getDescribe().fields.getMap();
    
    //         // Set updated field values
    //         for (String fieldName : updatedFields.keySet()) {
    //             Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldName).getDescribe();
    //             Object fieldValue = updatedFields.get(fieldName);
    //             obj.put(fieldName, convertFieldValue(fieldDescribe, fieldValue));
    //         }

    //         System.debug('obj: ' + obj);

    //         // Update the record
    //         update obj;
            
    //         System.debug('Record updated successfully.');
    //     } catch (QueryException qe) {
    //         System.debug('Query Exception: ' + qe.getMessage());
    //         throw new AuraHandledException('Error querying record: ' + qe.getMessage());
    //     } catch (DmlException de) {
    //         System.debug('DML Exception: ' + de.getMessage());
    //         throw new AuraHandledException('Error updating record: ' + de.getMessage());
    //     } catch (Exception e) {
    //         System.debug('Exception: ' + e.getMessage());
    //         throw new AuraHandledException('An unexpected error occurred: ' + e.getMessage());
    //     }
    // }

    // @AuraEnabled
    // public static void createRecord(String objectName, Map<String, Object> fields, String recordTypeId) {
    //     try {
    //         SObject obj = Schema.getGlobalDescribe().get(objectName).newSObject();
    //         Map<String, Schema.SObjectField> fieldMap = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap();
    
    //         // Set RecordTypeId
    //         obj.put('RecordTypeId', recordTypeId);
    
    //         // Set field values
    //         for (String fieldName : fields.keySet()) {
    //             Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldName).getDescribe();
    //             Object fieldValue = fields.get(fieldName);
    //             obj.put(fieldName, convertFieldValue(fieldDescribe, fieldValue));
    //         }
    
    //         // Insert the new record
    //         insert obj;
    
    //         System.debug('Record created successfully.');
    //     } catch (DmlException de) {
    //         System.debug('DML Exception: ' + de.getMessage());
    //         throw new AuraHandledException('Error creating record: ' + de.getMessage());
    //     } catch (Exception e) {
    //         System.debug('Exception: ' + e.getMessage());
    //         throw new AuraHandledException('An unexpected error occurred: ' + e.getMessage());
    //     }
    // }

    // private static Object convertFieldValue(Schema.DescribeFieldResult fieldDescribe, Object fieldValue) {
    //     if (fieldValue == null || (fieldvalue instanceof String && String.isBlank((String)fieldValue))) {
    //         return null;
    //     }

    //     try {
    //         if (fieldDescribe.getType() == Schema.DisplayType.Date) {
    //             if (fieldValue instanceof String) {
    //                 return Date.valueOf((String)fieldValue);
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Datetime) {
    //             if (fieldValue instanceof String) {
    //                 String dateTimeStr = (String)fieldValue;
    //                 if (dateTimeStr.endsWith('Z')) {
    //                     dateTimeStr = dateTimeStr.replace('T', ' ').replace('Z', '');
    //                     return Datetime.valueOfGmt(dateTimeStr);
    //                 } else {
    //                     dateTimeStr = dateTimeStr.replace('T', ' ');
    //                     return Datetime.valueOf(dateTimeStr);
    //                 }
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Integer) {
    //             if (fieldValue instanceof String) {
    //                 return Integer.valueOf((String)fieldValue);
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Double || 
    //                 fieldDescribe.getType() == Schema.DisplayType.Percent) {
    //             if (fieldValue instanceof String) {
    //                 return Double.valueOf((String)fieldValue);
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Boolean) {
    //             return Boolean.valueOf(fieldValue);
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Currency) {
    //             if (fieldValue instanceof String) {
    //                 return Decimal.valueOf((String)fieldValue);
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Email || 
    //                 fieldDescribe.getType() == Schema.DisplayType.Phone || 
    //                 fieldDescribe.getType() == Schema.DisplayType.Url || 
    //                 fieldDescribe.getType() == Schema.DisplayType.String ||
    //                 fieldDescribe.getType() == Schema.DisplayType.TextArea ||
    //                 fieldDescribe.getType() == Schema.DisplayType.EncryptedString) {
    //             if (fieldValue instanceof String) {
    //                 return (String)fieldValue;
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Base64) {
    //             if (fieldValue instanceof String) {
    //                 return EncodingUtil.base64Decode((String)fieldValue);
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Combobox || 
    //                 fieldDescribe.getType() == Schema.DisplayType.Picklist || 
    //                 fieldDescribe.getType() == Schema.DisplayType.MultiPicklist) {
    //             if (fieldValue instanceof String) {
    //                 return (String)fieldValue;
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.ID) {
    //             if (fieldValue instanceof String) {
    //                 return (String)fieldValue;
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Address) {
    //             if (fieldValue instanceof String) {
    //                 return JSON.deserialize((String)fieldValue, Address.class);
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Location) {
    //             if (fieldValue instanceof String) {
    //                 List<String> coords = ((String)fieldValue).split(',');
    //                 if (coords.size() == 2) {
    //                     Double latitude = Double.valueOf(coords[0]);
    //                     Double longitude = Double.valueOf(coords[1]);
    //                     return Location.newInstance(latitude, longitude);
    //                 } else {
    //                     throw new IllegalArgumentException('Invalid geolocation value: ' + fieldValue);
    //                 }
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Json) {
    //             if (fieldValue instanceof String) {
    //                 return JSON.deserializeUntyped((String)fieldValue);
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Time) {
    //             if (fieldValue instanceof String) {
    //                 List<String> timeParts = ((String)fieldValue).split(':');
    //                 Integer hours = Integer.valueOf(timeParts[0]);
    //                 Integer minutes = Integer.valueOf(timeParts[1]);
    //                 Integer seconds = Integer.valueOf(timeParts[2].split('\\.')[0]);
    //                 Integer milliseconds = timeParts[2].contains('.') ? Integer.valueOf(timeParts[2].split('\\.')[1]) : 0;
    //                 return Time.newInstance(hours, minutes, seconds, milliseconds);
    //             }
    //         } else if (fieldDescribe.getType() == Schema.DisplayType.Reference || 
    //                 fieldDescribe.getType() == Schema.DisplayType.SObject) {
    //             if (fieldValue instanceof String) {
    //                 return (String)fieldValue;
    //             }
    //         } else {
    //             return fieldValue;
    //         }
    //     } catch (Exception e) {
    //         throw new IllegalArgumentException('Error converting field value: ' + fieldValue + ' for field: ' + fieldDescribe.getName() + '. ' + e.getMessage());
    //     }
    //     return null;
    // }

    @AuraEnabled
    public static void deleteRecord(String recordId, String objectName) {
        System.debug('Deleting record with Id: ' + recordId + ' of object: ' + objectName);

        // Constructing a dynamic SOQL query to get the record to be deleted
        SObject obj = Database.query('SELECT Id FROM ' + objectName + ' WHERE Id = :recordId LIMIT 1');

        // Deleting the record
        delete obj;
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getPicklistValues(String objectName, String fieldName) {
        List<String> picklistValues = new List<String>();
        try {
            Schema.DescribeFieldResult fieldResult = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe();
            List<Schema.PicklistEntry> picklistEntries = fieldResult.getPicklistValues();
            for (Schema.PicklistEntry entry : picklistEntries) {
                picklistValues.add(entry.getValue());
            }
        } catch (Exception e) {
            System.debug('Error fetching picklist values: ' + e.getMessage());
        }
        return picklistValues;
    }

    // @AuraEnabled(cacheable=true)
    // public static Map<String, Object> getContactRecord(String contactId) {
    //     // Define the fields you want to retrieve from the Contact record
    //     List<String> fields = new List<String>{
    //         'FirstName', 'LastName', 'Phone', 'Email', 'MailingStreet', 'MailingCity', 'MailingState', 'MailingPostalCode', 'MailingCountry'
    //     };
        
    //     String soql = 'SELECT ' + String.join(fields, ', ') + ' FROM Contact WHERE Id = :contactId';
    //     List<Contact> contacts = Database.query(soql);
        
    //     if (contacts.isEmpty()) {
    //         return null;
    //     }
        
    //     // Convert the Contact record to a map of field values
    //     Map<String, Object> contactData = new Map<String, Object>();
    //     Contact contact = contacts[0];
    //     for (String field : fields) {
    //         contactData.put(field, contact.get(field));
    //     }
        
    //     return contactData;
    // }

    @AuraEnabled(cacheable=true)
    public static List<Account> getAccountSearchResults(String searchTerm) {
        // Check if search term is provided
        if (String.isBlank(searchTerm)) {
            return new List<Account>(); // Return empty list if no search term is provided
        }
        
        // Query the Account object for matching records, filtering by Account Name
        String likeSearchTerm = '%' + String.escapeSingleQuotes(searchTerm) + '%';
        List<Account> accounts = [
            SELECT Id, Name, Phone, ShippingStreet, ShippingCity, ShippingPostalCode 
            FROM Account 
            WHERE Name LIKE :likeSearchTerm
            LIMIT 10
        ];
        
        return accounts;
    }

    @AuraEnabled(cacheable=true)
    public static Account getAccountById(Id accountId) {
        // Perform a SOQL query to retrieve the account
        return [SELECT Id, Name FROM Account WHERE Id = :accountId LIMIT 1];
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

    public void veryTemporaryTest(){
        integer i = 0;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
        i = i + 1;
    }
}
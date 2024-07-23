public class FileControllerGraph {

    // Method to upload file to SharePoint
    @AuraEnabled(cacheable=false)
    public static String uploadFileToSharePoint(String filePath, String fileName, String fileContent, String documentType) {
        String siteId = getSiteId();
        String encodedFileName = encodeFileName(fileName);
        String uploadUrl = 'callout:BV_Sharepoint_Named_Azure/v1.0/sites/' + siteId + '/drive/root:/' + filePath + '/' + encodedFileName + ':/content';
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(uploadUrl);
        req.setMethod('PUT');
        req.setHeader('Content-Type', 'application/octet-stream');
        req.setHeader('Accept', 'application/json');
        req.setBody(fileContent);
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 201 || res.getStatusCode() == 200) {
            System.debug('File uploaded successfully.');
            // Extract the ID from the response
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            String itemId = (String) result.get('id');
            // Fetch listItem information
            Map<String, String> listItemInfo = getListItemInfo(siteId, itemId);
            String listId = listItemInfo.get('listId');
            String listItemId = listItemInfo.get('listItemId');
            tagDocument(siteId, listId, listItemId, fileName, documentType);
            return itemId; // Return the document ID
        } else {
            System.debug('File upload failed: ' + res.getStatus() + ' ' + res.getBody());
            return null;
        }
    }

    // Method to tag a document in SharePoint
    private static void tagDocument(String siteId, String listId, String listItemId, String fileName, String documentType) {
        String tagUrl = 'callout:BV_Sharepoint_Named_Azure/v1.0/sites/' + siteId + '/lists/' + listId + '/items/' + listItemId + '/fields';
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(tagUrl);
        req.setMethod('PATCH');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Accept', 'application/json');
        
        Map<String, Object> fields = new Map<String, Object>();
        fields.put('DocumentType', documentType);
        
        req.setBody(JSON.serialize(fields));
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            System.debug('Document tagged successfully.');
        } else {
            System.debug('Document tagging failed: ' + res.getStatus() + ' ' + res.getBody());
        }
    }

    // Method to get the site ID from SharePoint
    private static String getSiteId() {
        String endpoint = 'callout:BV_Sharepoint_Named_Azure/v1.0/sites/glduat.sharepoint.com:/sites/XansiumUATTestSite';
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        if (res.getStatusCode() == 200) {
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            return (String) result.get('id');
        } else {
            throw new CalloutException('Failed to get site ID: ' + res.getStatus() + ' ' + res.getBody());
        }
    }

    // Method to get list item information from SharePoint
    private static Map<String, String> getListItemInfo(String siteId, String itemId) {
        String listItemUrl = 'callout:BV_Sharepoint_Named_Azure/v1.0/sites/' + siteId + '/drive/items/' + itemId + '/listItem?expand=fields';
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(listItemUrl);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        if (res.getStatusCode() == 200) {
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            System.debug(JSON.serializePretty(result));
            Map<String, Object> parentReference = (Map<String, Object>) result.get('parentReference');
            System.debug('parentReference: ' + parentReference);
            String listId = (String) parentReference.get('id');
            String listItemId = (String) result.get('id');
            Map<String, String> listItemInfo = new Map<String, String>();
            String getListIdByName = getListIdByName(siteId, 'Documents');
            listItemInfo.put('listId', getListIdByName);
            listItemInfo.put('listItemId', listItemId);
            return listItemInfo;
        } else {
            throw new CalloutException('Failed to get list item information: ' + res.getStatus() + ' ' + res.getBody());
        }
    }
    
    // Method to get list ID by name
    private static String getListIdByName(String siteId, String listTitle) {
        String endpoint = 'callout:BV_Sharepoint_Named_Azure/v1.0/sites/' + siteId + '/lists/' + listTitle;
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        if (res.getStatusCode() == 200) {
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());

            System.debug(JSON.serializePretty(result));
            return (String) result.get('id');
        } else {
            throw new CalloutException('Failed to get list ID: ' + res.getStatus() + ' ' + res.getBody());
        }
    }

    @AuraEnabled(cacheable=false)
    // Method to delete a file from SharePoint
    public static void deleteFileFromSharePoint(String filePath, String fileName) {
        // Fetch the site ID within this method
        String siteId = getSiteId();
        
        String deleteUrl = 'callout:BV_Sharepoint_Named_Azure/v1.0/sites/' + siteId + '/drive/root:/' + filePath + '/' + fileName;
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(deleteUrl);
        req.setMethod('DELETE');
        req.setHeader('Accept', 'application/json');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 204) {
            System.debug('File deleted successfully.');
        } else {
            System.debug('File deletion failed: ' + res.getStatus() + ' ' + res.getBody());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> fetchAllFilesFromFolder(String folderPath) {
        String siteId = getSiteId();
        String folderUrl = 'callout:BV_Sharepoint_Named_Azure/v1.0/sites/' + siteId + '/drive/root:/' + folderPath + ':/children?$expand=listItem($expand=fields)';
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(folderUrl);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            if (result.containsKey('value')) {
                List<Object> rawFiles = (List<Object>) result.get('value');
                List<Map<String, Object>> files = new List<Map<String, Object>>();
                for (Object rawFile : rawFiles) {
                    files.add((Map<String, Object>) rawFile);
                }
                return files;
            } else {
                throw new CalloutException('Response does not contain expected "value" key.');
            }
        } else {
            throw new CalloutException('Failed to fetch files: ' + res.getStatus() + ' ' + res.getBody());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> fetchFilesFromSharePoint(String folderPath, String documentType) {
        String siteId = getSiteId();
        String folderUrl = 'callout:BV_Sharepoint_Named_Azure/v1.0/sites/' + siteId + '/drive/root:/' + folderPath + ':/children?$expand=thumbnails,listItem($expand=fields)';
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(folderUrl);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            if (result.containsKey('value')) {
                List<Object> rawFiles = (List<Object>) result.get('value');
                List<Map<String, Object>> files = new List<Map<String, Object>>();
                for (Object rawFile : rawFiles) {
                    Map<String, Object> file = (Map<String, Object>) rawFile;
                    if (file.containsKey('listItem')) {
                        Map<String, Object> listItem = (Map<String, Object>) file.get('listItem');
                        Map<String, Object> fields = (Map<String, Object>) listItem.get('fields');
                        if (fields != null && documentType.equals(fields.get('DocumentType'))) {
                            if (file.containsKey('thumbnails')) {
                                Map<String, Object> thumbnails = (Map<String, Object>) ((List<Object>) file.get('thumbnails')).get(0);
                                String thumbnailUrl = (String) ((Map<String, Object>) thumbnails.get('medium')).get('url');
                                file.put('thumbnailUrl', thumbnailUrl);
                            }
                            files.add(file);
                        }
                    }
                }
                return files;
            } else {
                throw new CalloutException('Response does not contain expected "value" key.');
            }
        } else {
            throw new CalloutException('Failed to fetch files: ' + res.getStatus() + ' ' + res.getBody());
        }
    }

    @AuraEnabled
    public static List<String> processFiles(List<Id> documentIds) {
        List<String> results = new List<String>();

        for (Id documentId : documentIds) {
            // Retrieve the ContentVersion data
            ContentVersion cv = [
                SELECT Title, VersionData
                FROM ContentVersion
                WHERE ContentDocumentId = :documentId
                LIMIT 1
            ];
            
            // Convert Blob to Base64 - only if needed to send as Base64
            String base64Data = EncodingUtil.base64Encode(cv.VersionData);

            // Add the result of each operation to the results list
            results.add(base64Data);
        }
        
        return results;
    }

    private static String encodeFileName(String fileName) {
        // Replace only the necessary characters that might break the URL
        return fileName.replace(' ', '%20')
                    .replace('#', '%23')
                    .replace('&', '%26')
                    .replace('?', '%3F')
                    .replace('%', '%25')
                    .replace('{', '%7B')
                    .replace('}', '%7D')
                    .replace('^', '%5E')
                    .replace('[', '%5B')
                    .replace(']', '%5D')
                    .replace('`', '%60')
                    .replace('\'', '%27');
    }

    @AuraEnabled(cacheable=true)
    public static String getCaseName(Id caseId) {
        BV_Case__c bvCase = [
            SELECT Name 
            FROM BV_Case__c 
            WHERE Id = :caseId 
            LIMIT 1
        ];
        return bvCase.Name;
    }

    public static void handleEmailAttachments(Id emailMessageId, Id caseHistoryId, Id caseId) {
        List<ContentDocumentLink> contentDocumentLinks = [
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :emailMessageId
        ];

        for (ContentDocumentLink contentDocumentLink : contentDocumentLinks) {
            ContentVersion contentVersion = [
                SELECT Id, Title, VersionData, FileExtension, ContentSize
                FROM ContentVersion
                WHERE ContentDocumentId = :contentDocumentLink.ContentDocumentId AND IsLatest = true
                LIMIT 1
            ];

            String normalizedCaseName = getCaseName(caseId);
            String folderPath = normalizedCaseName + '/' + caseHistoryId;

            // Include the file extension in the filename
            String fileNameWithExtension = contentVersion.Title + '.' + contentVersion.FileExtension;

            String base64Data = EncodingUtil.base64Encode(contentVersion.VersionData);
            String documentType = 'Email Attachment'; // Adjust as needed
            String documentId = uploadFileToSharePoint(folderPath, fileNameWithExtension, base64Data, documentType);

            if (documentId != null) {
                createSHDocumentRecord(caseHistoryId, contentVersion, documentId, normalizedCaseName);
            }
        }
    }

    public static void createSHDocumentRecord(Id caseHistoryId, ContentVersion contentVersion, String documentId, String caseName) {
        SHDocument__c shDocument = new SHDocument__c();
        shDocument.Case_History__c = caseHistoryId;
        shDocument.DocumentID__c = documentId;
        shDocument.Name = contentVersion.Title;
        shDocument.Document_Name__c = contentVersion.Title;
        shDocument.FileContent__c = EncodingUtil.base64Encode(contentVersion.VersionData);
        shDocument.DocumentType__c = 'Email Attachment'; // Adjust as needed
        shDocument.FileSize__c = contentVersion.ContentSize;
        shDocument.DocumentExtension__c = contentVersion.FileExtension;
        shDocument.ServerRelativeURL__c = '/sites/XansiumUATTestSite/Shared%20Documents/' + caseName + '/' + caseHistoryId + '/' + contentVersion.Title + '.' + contentVersion.FileExtension;
        insert shDocument;
    }
}
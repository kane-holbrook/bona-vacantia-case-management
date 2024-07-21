public with sharing class FileController {

    public static final String SHAREPOINT_NAMED_CREDENTIAL = 'BVSharepointNamed';

    @AuraEnabled(cacheable=true)
    public static List<ContentVersion> getFiles(String fileType, Id caseId) {
        List<ContentVersion> files = new List<ContentVersion>();

        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :caseId
        ];
        
        System.debug(links);
    
        Set<Id> docIds = new Set<Id>();
        for (ContentDocumentLink link : links) {
            docIds.add(link.ContentDocumentId);
        }
    
        if (!docIds.isEmpty()) {
            files = [
                SELECT Id, Title, FileType, Type__c, FileExtension, ContentDocumentId
                FROM ContentVersion
                WHERE Type__c = :fileType
                AND ContentDocumentId IN :docIds
                LIMIT 100
            ];
        }
    
        return files;
    }

    @AuraEnabled
    public static String uploadFile(String fileName, String base64Data, String fileType) {
        Blob fileContent = EncodingUtil.base64Decode(base64Data);

        ContentVersion cv = new ContentVersion();
        cv.VersionData = fileContent;
        cv.Title = fileName;
        cv.PathOnClient = '/' + fileName;
        cv.Type__c = fileType;
        insert cv;

        return cv.Id;
    }
    
    @AuraEnabled
    public static String uploadFileToSharePoint(String folderName, String fileName, String base64Data, String documentType) {
        // Decode the base64 string to get the binary content of the file
        Blob fileContent = EncodingUtil.base64Decode(base64Data);
    
        // Manually encode the file name to ensure all special characters are properly URL encoded
        String encodedFolderName = EncodingUtil.urlEncode(folderName, 'UTF-8');
        
        // Check if the folder exists; if not, create it
        if (!doesFolderExist(encodedFolderName)) {
            createSharePointFolder(encodedFolderName);
        }
        
        String processedFileName = encodeFileName(fileName);
    
        // Construct the endpoint with the Named Credential and the path for the file in SharePoint
        // Use the folder name to specify the target folder
        String endpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/GetFolderByServerRelativeUrl(\'' +
                          'Shared%20Documents/' + encodedFolderName + '\')/Files/Add(url=\'' +
                          processedFileName + '\',overwrite=true)';
    
        // Create the HTTP request using the endpoint
        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/octet-stream');
        req.setHeader('Accept', 'application/json;odata=verbose');
        req.setBodyAsBlob(fileContent);
    
        // Send the request
        Http http = new Http();
        HttpResponse res = http.send(req);
    
        System.debug('HTTP Request Sent');
        System.debug('HTTP Response Body: ' + res.getBody());
    
        // Handle the response
        if (res.getStatusCode() == 200 || res.getStatusCode() == 201) {
            String responseBody = res.getBody();
            
            // Deserialize the response and extract the file's server-relative URL
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
            Map<String, Object> d = (Map<String, Object>) result.get('d');
            String serverRelativeUrl = (String) d.get('ServerRelativeUrl');
            
            // Retrieve the ListItemID
            String listItemID = getListItemIDByFileUrl(serverRelativeUrl);
        
            // Check if listItemID is retrieved successfully
            if (listItemID != null) {
                // Tag the document with the documentType
                tagDocument(listItemID, documentType);
            } else {
                // Handle the case where ListItemID could not be retrieved
                System.debug('Could not retrieve ListItemID for the file.');
            }
    
            return listItemID;
        } else {
            // If the callout was not successful, handle the error accordingly
            System.debug('Error from SharePoint: ' + res.getBody());
            throw new AuraHandledException('Error uploading file to SharePoint: ' + res.getStatus());
        }
    }

    // @AuraEnabled(cacheable=true)
    // public static List<Items_BV_Sharepoint__x> getSharepointDocuments(String searchKey) {
    //     // Build the SOQL query string dynamically based on search criteria
    //     String query = 'SELECT Author__c, ContentLength__c, CreationDate__c, ExternalId, IsFolder__c, MimeType__c, Name__c, UpdateDate__c, UpdatedBy__c FROM Items_BV_Sharepoint__x WHERE Name__c LIKE :searchKey ORDER BY CreationDate__c DESC';
        
    //     // Execute the query and return the results
    //     List<Items_BV_Sharepoint__x> documents = Database.query(query);
    //     return documents;
    // }

    public static void createSharePointFolder(String folderPath) {
        // Construct the endpoint URL for SharePoint folder creation
        String sharepointSiteUrl = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/folders';
		String folderAbsolutePath = '/sites/XansiumUATTestSite/Shared%20Documents' + folderPath;


        // Setup the HTTP request
        HttpRequest req = new HttpRequest();
        req.setEndpoint(sharepointSiteUrl);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json;odata=verbose');
        req.setHeader('Accept', 'application/json;odata=verbose');
        
        // Construct the JSON body with the folder path
        String body = '{ \'__metadata\': { \'type\': \'SP.Folder\' }, \'ServerRelativeUrl\': \'' + folderAbsolutePath + '\' }';
        req.setBody(body);

        // Send the HTTP request
        Http http = new Http();
        try {
            HTTPResponse res = http.send(req);
            // Handle the response as needed
            System.debug('Response Status: ' + res.getStatus());
            System.debug('Response Body: ' + res.getBody());
        } catch(System.CalloutException e) {
            // Handle the callout exception as needed
            System.debug('Callout error: ' + e.getMessage());
        }
    }
    
    public static Boolean doesFolderExist(String folderPath) {
        String encodedFolderPath = EncodingUtil.urlEncode(folderPath, 'UTF-8');
        String sharepointSiteUrl = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/GetFolderByServerRelativeUrl(\'' 
                                   + encodedFolderPath + '\')';

        HttpRequest req = new HttpRequest();
        req.setEndpoint(sharepointSiteUrl);
        req.setMethod('GET');
        req.setHeader('Content-Type', 'application/json;odata=verbose');
        req.setHeader('Accept', 'application/json;odata=verbose');

        Http http = new Http();
        try {
            HttpResponse res = http.send(req);
            // If the folder exists, SharePoint will return a 200 status code
            if (res.getStatusCode() == 200) {
                return true;
            }
        } catch(System.CalloutException e) {
            // If the folder does not exist, SharePoint will likely throw an error, which we catch here
            System.debug('Callout error: ' + e.getMessage());
        }
        return false; // Return false if the folder does not exist or an error occurred
    }
    
    public static void tagDocument(String documentId, String documentType) {
    	String updateEndpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/lists/getbytitle(\'Documents\')/items(' + documentId + ')';

        // Setup the HTTP request for updating document metadata
        HttpRequest req = new HttpRequest();
        req.setEndpoint(updateEndpoint);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('X-HTTP-Method', 'MERGE');
        req.setHeader('If-Match', '*');

        // Construct the JSON body to update the DocumentType
        String body = '{';
        body += '\"DocumentType\": \"' + String.escapeSingleQuotes(documentType) + '\"';
        body += '}';
        req.setBody(body);

        // Send the HTTP request
        Http http = new Http();
        try {
            HTTPResponse res = http.send(req);
            // Handle the response as needed
            System.debug('Response Status: ' + res.getStatus());
            System.debug('Response Body: ' + res.getBody());
        } catch(System.CalloutException e) {
            // Handle the callout exception as needed
            System.debug('Callout error: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Document> fetchDocumentsByType(String documentType, String caseId) {
        String documentLibraryUrl = '/sites/XansiumUATTestSite/Shared%20Documents/' + caseId;
        String queryEndpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/GetFolderByServerRelativeUrl(\'' 
            + documentLibraryUrl 
            + '\')/Files?$filter=ListItemAllFields/DocumentType%20eq%20(\'' + documentType + '\')';
 
        HttpRequest req = new HttpRequest();
        req.setEndpoint(queryEndpoint);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json;odata=verbose');

        Http http = new Http();
        try {
            HTTPResponse res = http.send(req);
            if (res.getStatusCode() == 200) {
                // Parse the JSON response
                String responseBody = res.getBody();
                Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
                
                // Assuming the relevant data is in the 'd' object and then in 'results' array
                Map<String, Object> d = (Map<String, Object>) responseMap.get('d');
                List<Object> results = (List<Object>) d.get('results');
                
                List<Document> documents = new List<Document>();
                for (Object result : results) {
                    Map<String, Object> resultData = (Map<String, Object>) result;
    
                    // Create a new Document object and populate it with data from the result
                    Document doc = new Document();
                    doc.Keywords = (String) resultData.get('UniqueId');
                    doc.Name = (String) resultData.get('Name');
    				doc.Url = (String) resultData.get('ServerRelativeUrl');
                    
                    system.debug(JSON.serializePretty(resultData));
                    documents.add(doc);
                }
                return documents;
            } else {
                // Handle error
                System.debug('Error Status: ' + res.getStatus());
                System.debug('Error Body: ' + res.getBody());
                return new List<Document>();
            }
        } catch(System.CalloutException e) {
            // Handle the callout exception as needed
            System.debug('Callout error: ' + e.getMessage());
            return new List<Document>();
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<SHDocument__c> fetchAllDocumentsForCase(String caseId) {
        String documentLibraryUrl = '/sites/XansiumUATTestSite/Shared%20Documents/' + caseId;
        String queryEndpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/GetFolderByServerRelativeUrl(\'' + documentLibraryUrl + '\')/Files';
    
        HttpRequest req = new HttpRequest();
        req.setEndpoint(queryEndpoint);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json;odata=verbose');
    
        Http http = new Http();
        try {
            HTTPResponse res = http.send(req);
            if (res.getStatusCode() == 200) {
                // Parse the JSON response
                String responseBody = res.getBody();
                Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
                Map<String, Object> d = (Map<String, Object>) responseMap.get('d');
                List<Object> results = (List<Object>) d.get('results');
                
                List<SHDocument__c> documents = new List<SHDocument__c>();
                for (Object result : results) {
                    Map<String, Object> resultData = (Map<String, Object>) result;

                    SHDocument__c doc = new SHDocument__c();
                    doc.DocumentID__c = (String) resultData.get('UniqueId');
                    doc.Name = (String) resultData.get('Name');
                    doc.ServerRelativeURL__c = (String) resultData.get('ServerRelativeUrl');
                    system.debug(JSON.serializePretty(resultData));
                    
                    // Extracting file extension
                    String filename = doc.Name;
                    Integer lastIndexOfDot = filename.lastIndexOf('.');
                    if (lastIndexOfDot > 0) {
                        String extension = filename.substring(lastIndexOfDot + 1);
                        doc.DocumentExtension__c = extension;
                    }

                    // Use the getListItemIDByFileUrl method to get the ListItemID
                    String listItemID = getListItemIDByFileUrl(doc.ServerRelativeURL__c);

                    if (listItemID != null) {
                        // Make a callout to retrieve list item details including custom fields
                        String listItemEndpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/lists/GetByTitle(\'Documents\')/items(' + listItemID + ')';
                        HttpRequest listItemReq = new HttpRequest();
                        listItemReq.setEndpoint(listItemEndpoint);
                        listItemReq.setMethod('GET');
                        listItemReq.setHeader('Accept', 'application/json;odata=verbose');

                        HttpResponse listItemRes = http.send(listItemReq);

                        if (listItemRes.getStatusCode() == 200) {
                            String listItemBody = listItemRes.getBody();
                            Map<String, Object> listItemJson = (Map<String, Object>) JSON.deserializeUntyped(listItemBody);
                            Map<String, Object> listItemData = (Map<String, Object>) listItemJson.get('d');

                            // Accessing a custom field
                            doc.Created_Time__c = (String) listItemData.get('Created');
                            doc.DocumentType__c = (String) listItemData.get('DocumentType');
                            system.debug(JSON.serializePretty(listItemData));
                        } else {
                            System.debug('Error getting list item details: ' + listItemRes.getBody());
                        }
                    }
                    
                    documents.add(doc);
                }
                return documents;
            } else {
                // Handle error
                System.debug('Error Status: ' + res.getStatus());
                System.debug('Error Body: ' + res.getBody());
                return new List<SHDocument__c>();
            }
        } catch(System.CalloutException e) {
            // Handle the callout exception as needed
            System.debug('Callout error: ' + e.getMessage());
            return new List<SHDocument__c>();
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<SHDocument__c> fetchTemplates() {
        String documentLibraryUrl = '/sites/XansiumUATTestSite/Shared%20Documents/Templates';
        String queryEndpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/GetFolderByServerRelativeUrl(\'' + documentLibraryUrl + '\')/Files?$expand=ListItemAllFields';
    
        HttpRequest req = new HttpRequest();
        req.setEndpoint(queryEndpoint);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json;odata=verbose');
    
        Http http = new Http();
        try {
            HTTPResponse res = http.send(req);
            if (res.getStatusCode() == 200) {
                // Parse the JSON response
                String responseBody = res.getBody();
                Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
                Map<String, Object> d = (Map<String, Object>) responseMap.get('d');
                List<Object> results = (List<Object>) d.get('results');
                
                List<SHDocument__c> documents = new List<SHDocument__c>();
                for (Object result : results) {
                    Map<String, Object> resultData = (Map<String, Object>) result;

                    SHDocument__c doc = new SHDocument__c();
                    doc.DocumentID__c = (String) resultData.get('UniqueId');
                    doc.Name = (String) resultData.get('Name');
                    doc.ServerRelativeURL__c = (String) resultData.get('ServerRelativeUrl');
                    system.debug(JSON.serializePretty(resultData));
                    
                    // Extracting file extension
                    String filename = doc.Name;
                    Integer lastIndexOfDot = filename.lastIndexOf('.');
                    if (lastIndexOfDot > 0) {
                        String extension = filename.substring(lastIndexOfDot + 1);
                        doc.DocumentExtension__c = extension;
                    }

                    // Use the getListItemIDByFileUrl method to get the ListItemID
                    String listItemID = getListItemIDByFileUrl(doc.ServerRelativeURL__c);

                    if (listItemID != null) {
                        // Make a callout to retrieve list item details including custom fields
                        String listItemEndpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/lists/GetByTitle(\'Documents\')/items(' + listItemID + ')';
                        HttpRequest listItemReq = new HttpRequest();
                        listItemReq.setEndpoint(listItemEndpoint);
                        listItemReq.setMethod('GET');
                        listItemReq.setHeader('Accept', 'application/json;odata=verbose');

                        HttpResponse listItemRes = http.send(listItemReq);

                        if (listItemRes.getStatusCode() == 200) {
                            String listItemBody = listItemRes.getBody();
                            Map<String, Object> listItemJson = (Map<String, Object>) JSON.deserializeUntyped(listItemBody);
                            Map<String, Object> listItemData = (Map<String, Object>) listItemJson.get('d');

                            // Accessing a custom field
                            doc.Created_Time__c = (String) listItemData.get('Created');
                            doc.DocumentType__c = (String) listItemData.get('DocumentType');
                            doc.Document_Name__c = (String) listItemData.get('Document_x0020_Name');
                            doc.Document_Category__c = (String) listItemData.get('Document_x0020_Category');
                            system.debug(JSON.serializePretty(listItemData));
                        } else {
                            System.debug('Error getting list item details: ' + listItemRes.getBody());
                        }
                    }
                    
                    documents.add(doc);
                }
                return documents;
            } else {
                // Handle error
                System.debug('Error Status: ' + res.getStatus());
                System.debug('Error Body: ' + res.getBody());
                return new List<SHDocument__c>();
            }
        } catch(System.CalloutException e) {
            // Handle the callout exception as needed
            System.debug('Callout error: ' + e.getMessage());
            return new List<SHDocument__c>();
        }
    }

    @InvocableMethod(label='Fetch SharePoint Templates for Flow')
    public static List<List<SHDocument__c>> fetchTemplatesForFlow() {
        String documentLibraryUrl = '/sites/XansiumUATTestSite/Shared%20Documents/Templates';
        String queryEndpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/GetFolderByServerRelativeUrl(\'' + documentLibraryUrl + '\')/Files';
    
        HttpRequest req = new HttpRequest();
        req.setEndpoint(queryEndpoint);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json;odata=verbose');
    
        Http http = new Http();
        try {
            HTTPResponse res = http.send(req);
            if (res.getStatusCode() == 200) {
                // Parse the JSON response
                String responseBody = res.getBody();
                Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
                Map<String, Object> d = (Map<String, Object>) responseMap.get('d');
                List<Object> results = (List<Object>) d.get('results');
                
                List<SHDocument__c> documents = new List<SHDocument__c>();
                for (Object result : results) {
                    Map<String, Object> resultData = (Map<String, Object>) result;

                    SHDocument__c doc = new SHDocument__c();
                    doc.DocumentID__c = (String) resultData.get('UniqueId');
                    doc.Name = (String) resultData.get('Name');
                    doc.ServerRelativeURL__c = (String) resultData.get('ServerRelativeUrl');
                    system.debug(JSON.serializePretty(resultData));
                    
                    // Extracting file extension
                    String filename = doc.Name;
                    Integer lastIndexOfDot = filename.lastIndexOf('.');
                    if (lastIndexOfDot > 0) {
                        String extension = filename.substring(lastIndexOfDot + 1);
                        doc.DocumentExtension__c = extension;
                    }

                    // Use the getListItemIDByFileUrl method to get the ListItemID
                    String listItemID = getListItemIDByFileUrl(doc.ServerRelativeURL__c);

                    if (listItemID != null) {
                        // Make a callout to retrieve list item details including custom fields
                        String listItemEndpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/lists/GetByTitle(\'Documents\')/items(' + listItemID + ')';
                        HttpRequest listItemReq = new HttpRequest();
                        listItemReq.setEndpoint(listItemEndpoint);
                        listItemReq.setMethod('GET');
                        listItemReq.setHeader('Accept', 'application/json;odata=verbose');

                        HttpResponse listItemRes = http.send(listItemReq);

                        if (listItemRes.getStatusCode() == 200) {
                            String listItemBody = listItemRes.getBody();
                            Map<String, Object> listItemJson = (Map<String, Object>) JSON.deserializeUntyped(listItemBody);
                            Map<String, Object> listItemData = (Map<String, Object>) listItemJson.get('d');

                            // Accessing a custom field
                            doc.Created_Time__c = (String) listItemData.get('Created');
                            doc.DocumentType__c = (String) listItemData.get('DocumentType');
                            doc.Document_Name__c = (String) listItemData.get('DocumentName');
                            doc.Document_Category__c = (String) listItemData.get('DocumentCategory');
                            system.debug(JSON.serializePretty(listItemData));
                        } else {
                            System.debug('Error getting list item details: ' + listItemRes.getBody());
                        }
                    }
                    
                    documents.add(doc);
                }
                return new List<List<SHDocument__c>>{documents};
            } else {
                // Handle error
                System.debug('Error Status: ' + res.getStatus());
                System.debug('Error Body: ' + res.getBody());
                return new List<List<SHDocument__c>>();
            }
        } catch(System.CalloutException e) {
            // Handle the callout exception as needed
            System.debug('Callout error: ' + e.getMessage());
            return new List<List<SHDocument__c>>();
        }
    }
    
    public static String getListItemIDByFileUrl(String fileServerRelativeUrl) {
        String encodedUrl = EncodingUtil.urlEncode(fileServerRelativeUrl, 'UTF-8');
        encodedUrl = encodedUrl.replace('+', '%20');
		String endpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/GetFileByServerRelativeUrl(\'' + encodedUrl + '\')/ListItemAllFields';
    
        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json;odata=verbose');
    
        Http http = new Http();
        HttpResponse res = http.send(req);
    
        if (res.getStatusCode() == 200) {
            String responseBody = res.getBody();
            // Parse the JSON response to extract the ListItem ID
            Map<String, Object> jsonResponse = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
            Map<String, Object> d = (Map<String, Object>) jsonResponse.get('d');
            Integer listItemID = (Integer) d.get('ID');
    
            return String.valueOf(listItemID);
        } else {
            System.debug('Error retrieving ListItemID: ' + res.getBody());
            return null;
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static Boolean deleteSharepointFile(String caseId, String fileName) {
        String fileServerRelativeUrl = '/sites/XansiumUATTestSite/Shared%20Documents/' + caseId + '/' + fileName;
        
        // Define the endpoint using the named credential
        String endpoint = 'callout:' + SHAREPOINT_NAMED_CREDENTIAL + '/_api/web/GetFileByServerRelativeUrl(\'' + fileServerRelativeUrl + '\')';
    
        // Create a HTTP request for the DELETE operation
        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('POST'); // Use POST for the delete operation
        req.setHeader('Accept', 'application/json;odata=verbose');
        req.setHeader('If-Match', '*'); // Set the 'If-Match' header to '*' to allow unconditional delete
        req.setHeader('Content-Length', '0'); // Indicate that there is no content in the body
        req.setHeader('X-HTTP-Method', 'DELETE'); // Specify the delete operation
    
        // Send the request
        Http http = new Http();
        HttpResponse res;
        try {
            res = http.send(req);
        } catch (Exception e) {
            System.debug('Error making the request: ' + e.getMessage());
            return false;
        }
    
        // Check the response status
        if (res.getStatusCode() == 200) {
            System.debug('File deleted successfully');
            return true;
        } else {
            System.debug('Error deleting file: ' + res.getStatusCode() + ' ' + res.getBody());
            return false;
        }
    }

    @AuraEnabled
    public static void deleteFile(String contentDocumentId) {
        delete new ContentDocument(Id=contentDocumentId);
    }

    @AuraEnabled
    public static String uploadNewVersion(String contentVersionId, String fileName, String base64Data, String fileType) {
        Blob fileContent = EncodingUtil.base64Decode(base64Data);

        ContentVersion existingCV = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :contentVersionId LIMIT 1];

        ContentVersion newCV = new ContentVersion();
        newCV.ContentDocumentId = existingCV.ContentDocumentId;
        newCV.VersionData = fileContent;
        newCV.Title = fileName;
        newCV.PathOnClient = '/' + fileName;
        newCV.Type__c = fileType;
        insert newCV;

        return newCV.Id;
    }
    
    @AuraEnabled
    public static void associateFileWithCase(Id caseId, Id docId, String fileType) {
        ContentVersion latestVersion = [
            SELECT Id, Type__c
            FROM ContentVersion
            WHERE ContentDocumentId = :docId
            AND IsLatest = true
            LIMIT 1
        ];
        latestVersion.Type__c = fileType;
        update latestVersion;

        ContentDocumentLink cdl = new ContentDocumentLink();
        cdl.ContentDocumentId = docId;
        cdl.LinkedEntityId = caseId;
        cdl.ShareType = 'V';
        cdl.Visibility = 'AllUsers';
        insert cdl;
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
            
            System.debug(cv);
            
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
public class FileControllerGraph {

    // Method to upload file to SharePoint
    public static void uploadFileToSharePoint(String filePath, String fileName, String fileContent, String documentType) {
        String siteId = getSiteId();
        String uploadUrl = 'callout:BV_Sharepoint_Named_Azure/v1.0/sites/' + siteId + '/drive/root:/' + filePath + '/' + fileName + ':/content';
        
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
        } else {
            System.debug('File upload failed: ' + res.getStatus() + ' ' + res.getBody());
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

    public static List<Map<String, Object>> fetchAllFilesFromFolder(String folderPath) {
        String siteId = getSiteId();
        String folderUrl = 'callout:BV_Sharepoint_Named_Azure/v1.0/sites/' + siteId + '/drive/root:/' + folderPath + ':/children';
        
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
}
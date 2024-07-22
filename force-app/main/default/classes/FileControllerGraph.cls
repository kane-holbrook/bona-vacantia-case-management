public class FileControllerGraph {

    // Method to upload file to SharePoint
    public static void uploadFileToSharePoint(String filePath, String fileName, String fileContent) {
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
        } else {
            System.debug('File upload failed: ' + res.getStatus() + ' ' + res.getBody());
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
}
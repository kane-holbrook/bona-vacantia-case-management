public class SOSFinanceController 
{
    public string MatterCode { get; set; }
    public string Output { get; set; }
    public Map<string, object> Data { get; set; }

    private static final String sosEndpoint = 'callout:BVSOSFinanceNamed';
    
	public SOSFinanceController()
    {
        MatterCode = ApexPages.currentPage().getParameters().get('mtcode');
        
        string encoded = EncodingUtil.base64Encode(Blob.valueOf(MatterCode));
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(sosEndpoint + '/' + encoded); // Replace with your API endpoint URL
        req.setMethod('GET');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        // Process the response
        if (res.getStatusCode() == 200) {
            String responseBody = res.getBody();
            System.debug('Response Body: ' + responseBody);
            
            Output = responseBody;
            Data = (Map<String, Object>)JSON.deserializeUntyped(responseBody);

            System.debug('Data: ' + Data);
        } else {
            System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
        }
    }
    
    public PageReference createPostingSlip()
    {        
        string encoded = EncodingUtil.base64Encode(Blob.valueOf(MatterCode));
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(sosEndpoint + '/?code=' + encoded); // Replace with your API endpoint URL
        req.setMethod('POST');
    	req.setBody('');

        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        // Process the response
        if (res.getStatusCode() == 200) {
            String responseBody = res.getBody();
            
            System.debug('Posted slip');
        } else {
            System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
        }
        
        PageReference pg = ApexPages.CurrentPage();
        pg.setRedirect(true);
        return pg;
    }
    
    public object getPostSlips()
    {
        try {
            return Data.containsKey('dsPostSlipCreate') ? Data.get('dsPostSlipCreate') : new Map<string, object>();
        } catch (Exception e) {
            return new Map<string, object>();
        }
    }
    
    public object getLedger()
    {
        try {
            return Data.containsKey('dsaccledger') ? Data.get('dsaccledger') : new Map<string, object>();
        } catch (Exception e) {
            return new Map<string, object>();
        }
    }
    

}
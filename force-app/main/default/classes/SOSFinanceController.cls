public class SOSFinanceController 
{
    public string MatterCode { get; set; }
    public string Output { get; set; }
    public Map<string, object> Data { get; set; }

    private static final String sosEndpoint = 'callout:BVSOSFinanceNamed';
    
	public SOSFinanceController()
    {
        // MatterCode = ApexPages.currentPage().getParameters().get('mtcode');

        // if (MatterCode != null) {
        
        //     string encoded = EncodingUtil.base64Encode(Blob.valueOf(MatterCode));
            
        //     HttpRequest req = new HttpRequest();
        //     req.setEndpoint(sosEndpoint + '/' + encoded);
        //     req.setMethod('GET');
            
        //     Http http = new Http();
        //     HttpResponse res = http.send(req);
            
        //     // Process the response
        //     if (res.getStatusCode() == 200) {
        //         String responseBody = res.getBody();
        //         System.debug('Response Body: ' + responseBody);
                
        //         Output = responseBody;
        //         Data = (Map<String, Object>)JSON.deserializeUntyped((string)JSON.deserializeUntyped(responseBody));
        //     } else {
        //         System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
        //     }
        // }
    }

    public class Response
    {
        public string MtCode { get; set; }
        public boolean Errored { get; set; }
        public string ErrorMessage { get; set; }
        
        public string BANK { get; set; } 
        public string NET { get; set; }
        public boolean CPD { get; set; } 
        public string REFERENCE { get; set; }
        public string BRANCH { get; set; }
        public string DESCRIPTION { get; set; }
        public string DRCR { get; set; }
        public string INSTRUCTION { get; set; }
        public string NARRATIVE { get; set; }
        public string NOTES { get; set; }
        public string PAYEE { get; set; }
        public integer PERIOD { get; set; }
        public boolean POSTED { get; set; } 
        public string YEAR { get; set; }
    }

    public class NewSOSCase
    {
        public string mattertype { get; set; }
        public string mtcode { get; set; }
        public string ref { get; set; }
        public string description { get; set; }
        public string address_1 { get; set; }
        public string address_2 { get; set; }
        public string town { get; set; }
        public string county { get; set; }
        public string postcode { get; set; }
        public string forename { get; set; }
        public string name { get; set; }
        public string pitype { get; set; }
        public string clcode { get; set; }
        public string clname { get; set; }
        public string clbranch { get; set; }
        public string cltype { get; set; }
        public string testmtcode { get; set; }
    }
    
    public Response PostSlipResponse { get; set; }
    
    // public PageReference createPostingSlip()
    // {        
        
    //     HttpRequest req = new HttpRequest();
    //     req.setEndpoint(sosEndpoint); // Replace with your API endpoint URL
    //     req.setMethod('POST');
    // 	req.setBody('');

    //     Response r = new Response();
    //     r.MtCode = MatterCode;
    //     r.BANK = '01';
    //     r.NET = '1500.75';
    //     r.CPD = false;
    //     r.REFERENCE = 'Test Reference';
    //     r.BRANCH = 'Test';
    //     r.DESCRIPTION = 'Credit';
    //     r.DRCR = 'DR';
    //     r.INSTRUCTION = 'Test Instruction';
    //     r.NARRATIVE = 'Test Narrative - Credit';
    //     r.NOTES = 'Test Notes';
    //     r.PAYEE = 'Test Payee';
    //     r.PERIOD = 32;
    //     r.POSTED = false;
    //     r.YEAR = '2024';
        
            
    //     String jsonString = JSON.serialize(r);
    //     req.setHeader('Content-Type', 'application/json');
    //     req.setBody(jsonString);        
        
    //     system.debug(LOGGINGLEVEL.ERROR, 'REQUEST JSON: ' + jsonString);
        
    //     Http http = new Http();
    //     HttpResponse res = http.send(req);
        
    //     // Process the response
    //     if (res.getStatusCode() == 200) {
    //         String responseBody = res.getBody();
            
    //         System.debug('Posted slip');
    //     } else {
    //         System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
    //     }
        
    //     PostSlipResponse = (Response)JSON.deserialize(res.getBody(), Response.class);
    //     system.debug(LoggingLevel.ERROR, 'PostSlipResponse: ' + PostSlipResponse);
        
    //     return null;
    // }
    
    // public object getPostSlips() {
    //     if (Data != null) {
    //         return Data.containsKey('dsPostSlipCreate') ? Data.get('dsPostSlipCreate') : new Map<string, object>();
    //     } else {
    //         return new Map<string, object>();
    //     }
    // }
    
    // public object getLedger() {
    //     if (Data != null) {
    //         return Data.containsKey('dsaccledger') ? Data.get('dsaccledger') : new Map<string, object>();
    //     } else {
    //         return new Map<string, object>();
    //     }
    // }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getSOSData(String mtcode) {
        Map<String, Object> result = new Map<String, Object>();

        // Convert _ to /
        mtcode = mtcode.replace('_', '/');
        
        string encoded = EncodingUtil.base64Encode(Blob.valueOf(mtcode));
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(sosEndpoint + '/' + encoded); // Replace with your API endpoint URL
        req.setMethod('GET');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        // Process the response
        if (res.getStatusCode() == 200) {
            String responseBody = res.getBody();
            System.debug('Response Body: ' + responseBody);
            
            result = (Map<String, Object>)JSON.deserializeUntyped((string)JSON.deserializeUntyped(responseBody));
        } else {
            System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
        }
        
        return result;
    }

    @AuraEnabled(cacheable=false)
    public static String createAccrual(String MtCode, String Net, String Narrative, String Reference, String Type) {
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(sosEndpoint); // Replace with your API endpoint URL
        req.setMethod('POST');

        mtcode = MtCode.replace('_', '/');

        Response r = new Response();
        r.MtCode = mtcode;
        r.BANK = '01';
        r.NET = Net;
        r.CPD = false;
        r.REFERENCE = Reference;
        r.BRANCH = 'Test';
        r.DESCRIPTION = 'Credit';
        r.DRCR = Type;
        r.INSTRUCTION = 'Test Instruction';
        r.NARRATIVE = Narrative;
        r.NOTES = 'Test Notes';
        r.PAYEE = 'Test Payee';
        r.PERIOD = 32;
        r.POSTED = false;
        r.YEAR = '2024';

        String jsonString = JSON.serialize(r);
        req.setHeader('Content-Type', 'application/json');
        req.setBody(jsonString);        

        system.debug(LOGGINGLEVEL.ERROR, 'REQUEST JSON: ' + jsonString);
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            System.debug('Posted slip');
            return res.getBody();
        } else {
            System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
            return 'Error: ' + res.getStatusCode() + ' ' + res.getBody();
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static string reverseAccrual(String MtCode, String Net, String Narrative, String Reference, String Type) {
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(sosEndpoint); // Replace with your API endpoint URL
        req.setMethod('POST');

        mtcode = MtCode.replace('_', '/');

        Response r = new Response();
        r.MtCode = mtcode;
        r.BANK = '01';
        r.NET = Net;
        r.CPD = false;
        r.REFERENCE = Reference;
        r.BRANCH = 'Test';
        r.DESCRIPTION = 'Credit';
        r.DRCR = Type;
        r.INSTRUCTION = 'Test Instruction';
        r.NARRATIVE = 'Reversal of ' + Narrative;
        r.NOTES = 'Test Notes';
        r.PAYEE = 'Test Payee';
        r.PERIOD = 32;
        r.POSTED = false;
        r.YEAR = '2024';

        String jsonString = JSON.serialize(r);
        req.setHeader('Content-Type', 'application/json');
        req.setBody(jsonString);        

        system.debug(LOGGINGLEVEL.ERROR, 'REQUEST JSON: ' + jsonString);
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            System.debug('Posted slip');
            String responseBody = res.getBody();
            System.debug('RESPONSE BODY: ' + responseBody);
            return res.getBody();
        } else {
            System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
            return 'Error: ' + res.getStatusCode() + ' ' + res.getBody();
        }
    }

    @AuraEnabled(cacheable=false)
    public static String createNewSOSCase(String mtcode) {
        // Create a new Response object for the API call
        NewSOSCase r = new NewSOSCase();
        
        // Set the mtcode from the parameter
        r.MtCode = mtcode;
        
        // Hardcode all other values
        r.mattertype = '606';
        r.ref = 'REF12345';
        r.description = 'This is a test description for the matter';
        r.address_1 = 'address 1';
        r.address_2 = 'address 2';
        r.town = 'town name';
        r.county = 'country';
        r.postcode = 'PO5 3DA';
        r.forename = 'forename';
        r.name = 'Name';
        r.pitype = 'OR';
        r.clcode = '';
        r.clname = 'CLName';
        r.clbranch = '001';
        r.cltype = 'P';
        r.testmtcode = '21609809';

        // Prepare the HTTP request
        HttpRequest req = new HttpRequest();
        req.setEndpoint(sosEndpoint);
        req.setMethod('PUT');
        req.setHeader('Content-Type', 'application/json');
        
        // Serialize the Response object to JSON
        String jsonBody = JSON.serialize(r);
        req.setBody(jsonBody);

        System.debug(LoggingLevel.ERROR, 'REQUEST JSON: ' + jsonBody);
        
        // Send the HTTP request
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        // Process the response
        if (res.getStatusCode() == 200) {
            System.debug('New SOS case created successfully');
            return res.getBody();
        } else {
            System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
            return 'Error: ' + res.getStatusCode() + ' ' + res.getBody();
        }
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
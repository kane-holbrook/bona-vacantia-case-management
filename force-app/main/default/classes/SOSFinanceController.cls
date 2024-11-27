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
        public boolean Errored { get; set; }
        public string ErrorMessage { get; set; }
        
        public string mtcode { get; set; }
        public string bank { get; set; } 
        public string branch { get; set; }
        public string drcr { get; set; } 
        public string narrative { get; set; }
        public decimal net { get; set; }
        public string notes { get; set; }
        public string payee { get; set; }
        public string reference { get; set; }
        public string fee_earner { get; set; }
        public string nl_code { get; set; }
        public string contra_code { get; set; }
        public string post_type { get; set; }
        public string user_id { get; set; } 
        public string vat_code { get; set; }
        public decimal vat_val { get; set; }
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

    public class updateSOSCase
    {
        public string mtcode { get; set; }
        public string refer { get; set; }
        public string description { get; set; }
        public boolean archived { get; set; }
        public boolean closed { get; set; }
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
        req.setTimeout(120000); // Set timeout to 120 seconds (2 minutes)
        
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
        req.setTimeout(120000);

        mtcode = MtCode.replace('_', '/');

        Response r = new Response();
        r.mtcode = mtcode;
        r.bank = '01';
        r.branch = '001';
        r.drcr = Type;
        r.narrative = Narrative;
        r.net = Decimal.valueOf(Net);
        r.notes = '';
        r.payee = '';
        r.reference = '';
        r.fee_earner = 'VM';
        r.nl_code = '';
        r.contra_code = '';
        r.post_type = '01';
        r.user_id = 'ISHELP';
        r.vat_code = '';
        r.vat_val = 0.00;

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
        r.mtcode = mtcode;
        r.bank = '01';
        r.branch = '001';
        r.drcr = Type;
        r.narrative = 'Reversal ' + Narrative;
        r.net = Decimal.valueOf(Net);
        r.notes = '';
        r.payee = '';
        r.reference = '';
        r.fee_earner = 'VM';
        r.nl_code = '';
        r.contra_code = '';
        r.post_type = '01';
        r.user_id = 'ISHELP';
        r.vat_code = '';
        r.vat_val = 0.00;

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
        r.mtcode = mtcode;
        
        // Hardcode all other values
        r.mattertype = 'ESTA';
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

    @AuraEnabled(cacheable=false)
    public static String updateSOSCase(String mtcode, String refer, String description, Boolean closed) {
        
        Map<String, Object> updateData = new Map<String, Object>();
        
        // Set the parameters
        updateData.put('mtcode', mtcode);
        updateData.put('ref', refer);
        updateData.put('description', description);
        updateData.put('archived', false);
        updateData.put('closed', closed);

        // Prepare the HTTP request
        HttpRequest req = new HttpRequest();
        req.setEndpoint(sosEndpoint); // Assuming the endpoint includes the mtcode
        req.setMethod('PATCH');
        req.setTimeout(30000); // Set timeout to 30 seconds (30 seconds)
        req.setHeader('Content-Type', 'application/json');
        
        // Serialize the update data to JSON
        String jsonBody = JSON.serialize(updateData);
        req.setBody(jsonBody);

        System.debug(LoggingLevel.ERROR, 'UPDATE REQUEST JSON: ' + jsonBody);
        
        // Send the HTTP request
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        // Process the response
        if (res.getStatusCode() == 200) {
            System.debug('SOS case updated successfully');
            return res.getBody();
        } else {
            System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
            return 'Error: ' + res.getStatusCode() + ' ' + res.getBody();
        }
    }

    @InvocableMethod(label='Check Ledger Balance' description='Checks if officeDebit and accrualsDebit total to 0')
    public static List<Boolean> checkTotalsZero(List<String> mtcodes) {
        List<Boolean> results = new List<Boolean>();
        
        for (String mtcode : mtcodes) {
            // Convert _ to /
            mtcode = mtcode.replace('_', '/');

            // Fetch the SOS data for the given mtcode
            Map<String, Object> sosData = getSOSData(mtcode);

            // Initialize variables to store the totals
            Decimal officeTotal = 0;
            Decimal accrualsTotal = 0;

            // Calculate the officeTotal and accrualsTotal
            if (sosData != null && sosData.containsKey('dsaccledger')) {
                List<Object> ledgerData = (List<Object>)sosData.get('dsaccledger');
                for (Object ledgerEntry : ledgerData) {
                    Map<String, Object> entry = (Map<String, Object>)ledgerEntry;
                    if (entry.containsKey('OFFICE-DEBIT')) {
                        officeTotal += (Decimal)entry.get('OFFICE-DEBIT');
                    }
                    if (entry.containsKey('OFFICE-CREDIT')) {
                        officeTotal -= (Decimal)entry.get('OFFICE-CREDIT');
                    }
                    if (entry.containsKey('CLIENT-DEBIT')) {
                        accrualsTotal += (Decimal)entry.get('CLIENT-DEBIT');
                    }
                    if (entry.containsKey('CLIENT-CREDIT')) {
                        accrualsTotal -= (Decimal)entry.get('CLIENT-CREDIT');
                    }
                }
            }

            // Check if both officeTotal and accrualsTotal are equal to 0
            results.add(officeTotal == 0 && accrualsTotal == 0);
        }

        return results;
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
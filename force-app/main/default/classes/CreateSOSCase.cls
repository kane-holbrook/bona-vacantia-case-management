public class CreateSOSCase {
    public string MatterCode { get; set; }
    public string Output { get; set; }
    public Map<string, object> Data { get; set; }

    private static final String sosEndpoint = 'callout:BVSOSFinanceNamed';

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


    @InvocableMethod(label='Create New SOS Case' description='Creates a new SOS case.')
    public static List<String> createNewSOSCase(List<SOSCaseRequest> requests) {
        List<String> results = new List<String>();
        
        for (SOSCaseRequest reqData : requests) {
            // Create a new Response object for the API call
            NewSOSCase r = new NewSOSCase();
            
            // Set the mtcode from the request
            r.mtcode = '';
            
            // Hardcode all other values
            r.mattertype = reqData.mattertype;
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
                results.add(res.getBody());
            } else {
                System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
                results.add('Error: ' + res.getStatusCode() + ' ' + res.getBody());
            }
        }
        
        return results;
    }

    public class SOSCaseRequest {
        @InvocableVariable(required=true description='mattertype to be sent to the API')
        // public String mtcode;
        public String mattertype;
    }
}
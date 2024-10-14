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
    public static List<SOSCaseResponse> createNewSOSCase(List<SOSCaseRequest> requests) {
        List<SOSCaseResponse> results = new List<SOSCaseResponse>();
        Integer maxRetries = 2;
        
        for (SOSCaseRequest reqData : requests) {
            // Create a new Response object for the API call
            NewSOSCase r = new NewSOSCase();
            
            // Set the mtcode from the request
            r.mtcode = '';

            r.mattertype = reqData.mattertype;
            if (r.mattertype == 'COMP'){
                r.description = 'Company Name - ' + reqData.CompanyName + ', Case Officer reference (' + reqData.CaseOfficerRef + '), ' + ', Dissolution Date ' + reqData.DissolutionDate + ', Company Number (' + reqData.CompanyNumber + ')';
                r.address_1 = reqData.AddressLine1;
                r.address_2 = reqData.AddressLine2;
                r.town = reqData.Town;
                r.county = reqData.Country;
                r.postcode = reqData.Postcode;
                r.name = reqData.CompanyName;
                // r.feeearner = 'case officer assigned';
                r.pitype = 'OR';
                r.clname = reqData.CompanyName;
                r.clbranch = '001';
                r.cltype = 'COMP Companies';
            } else if (r.mattertype == 'ESTA'){
                r.description = 'Decd Surname - ' + reqData.DecdSurname + ', Case Officer Ref (' + reqData.CaseOfficerRef + '), Date of Death ' + reqData.DateOfDeath + ', Short Place ' + reqData.ShortPlace + ', at ' + reqData.AddressLine1;
                r.address_1 = reqData.AddressLine1;
                r.address_2 = reqData.AddressLine2;
                r.town = reqData.Town;
                r.county = reqData.Country;
                r.postcode = reqData.Postcode;
                r.forename = reqData.DecdForenames;
                r.name = reqData.DecdSurname;
                // r.feeearner = 'case officer assigned';
                r.pitype = 'OR';
                r.clname = reqData.Title + ' ' + reqData.DecdForenames + ' ' + reqData.DecdSurname;
                r.clbranch = '001';
                r.cltype = 'ESTA Estates';
            }
            r.ref = reqData.CaseID; // Case ID
            r.clcode = ''; // Case ID
            r.testmtcode = '21609809';

            Integer retryCount = 0;
            Boolean success = false;

            while (retryCount < maxRetries && !success) {
                try {
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

                        System.debug('RESPONSE: ' + res.getBody());
                        
                        // Remove extra double quotes surrounding the JSON string
                        String jsonString = res.getBody().removeStart('"').removeEnd('"');
                        
                        // Unescape the JSON string
                        String unescapedJson = jsonString.replace('\\', '');
                        
                        // Parse the unescaped JSON response
                        Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(unescapedJson);
                        String clcode = (String) responseMap.get('clcode');
                        String mtcode = (String) responseMap.get('mtcode');
                        
                        // Create a new SOSCaseResponse object with the extracted values
                        SOSCaseResponse response = new SOSCaseResponse();
                        response.clcode = clcode;
                        response.mtcode = mtcode;
                        results.add(response);
                        
                        success = true;
                    } else if (res.getStatusCode() == 503) {
                        System.debug('Service Unavailable (503). Retrying request...');
                    } else {
                        System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
                        SOSCaseResponse errorResponse = new SOSCaseResponse();
                        errorResponse.errorMessage = 'Error: ' + res.getStatusCode() + ' - ' + res.getStatus();
                        results.add(errorResponse);
                        break; // Exit the retry loop for non-503 errors
                    }
                } catch (Exception e) {
                    System.debug('Exception during HTTP request: ' + e.getMessage());
                    SOSCaseResponse errorResponse = new SOSCaseResponse();
                    errorResponse.errorMessage = 'Error: ' + e.getMessage();
                    results.add(errorResponse);
                    break; // Exit the retry loop if an exception occurs
                }
            }
        }
        
        return results;
    }

    public class SOSCaseRequest {
        @InvocableVariable(required=true description='mattertype to be sent to the API')
        public String mattertype; // Record Type Dev Name

        @InvocableVariable(required=false description='Case ID')
        public String CaseID;

        @InvocableVariable(required=false description='Company Name')
        public String CompanyName;

        @InvocableVariable(required=false description='Company Number')
        public String CompanyNumber;

        @InvocableVariable(required=false description='Case Officer Ref')
        public String CaseOfficerRef;

        @InvocableVariable(required=false description='Dissolution Date')
        public String DissolutionDate;

        @InvocableVariable(required=false description='First line of occupiers address')
        public String AddressLine1;

        @InvocableVariable(required=false description='Second line of occupiers address')
        public String AddressLine2;

        @InvocableVariable(required=false description='Town')
        public String Town;

        @InvocableVariable(required=false description='County')
        public String Country;

        @InvocableVariable(required=false description='Postcode')
        public String Postcode;

        @InvocableVariable(required=false description='Decd Surname')
        public String DecdSurname;

        @InvocableVariable(required=false description='DECD forenames')
        public String DecdForenames;

        @InvocableVariable(required=false description='Case Officer Ref')
        public String DateOfDeath;

        @InvocableVariable(required=false description='Short Place')
        public String ShortPlace;

        @InvocableVariable(required=false description='Case Officer Ref')
        public String Title;

    }

    public class SOSCaseResponse {
        @InvocableVariable(description='CLCode of the created case')
        public String clcode;
        
        @InvocableVariable(description='MTCode of the created case')
        public String mtcode;
        
        @InvocableVariable(description='Error message if any')
        public String errorMessage;
    }

}
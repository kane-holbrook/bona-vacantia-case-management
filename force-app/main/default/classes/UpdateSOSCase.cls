public class UpdateSOSCase {
    public string MatterCode { get; set; }
    public string Output { get; set; }
    public Map<string, object> Data { get; set; }

    private static final String sosEndpoint = 'callout:BVSOSFinanceNamed';

    public class SOSCase
    {
        public string mtcode { get; set; }
        public string refer { get; set; }
        public string description { get; set; }
        public boolean archived { get; set; }
    }

    @InvocableMethod(label='Update SOS Case' description='Updates an existing SOS case with the provided details.')
    public static List<String> updateSOSCase(List<SOSCaseUpdateRequest> requests) {
        List<String> results = new List<String>();
        
        for (SOSCaseUpdateRequest reqData : requests) {
            // Create a new object for the API call
            Map<String, Object> updateData = new Map<String, Object>();
            
            // Set the parameters from the request
            updateData.put('mtcode', reqData.mtcode);
            updateData.put('ref', reqData.refer);
            updateData.put('description', reqData.description);
            updateData.put('archived', reqData.archived);

            // Prepare the HTTP request
            HttpRequest req = new HttpRequest();
            req.setEndpoint(sosEndpoint);
            req.setMethod('PATCH');
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
                results.add(res.getBody());
            } else {
                System.debug('HTTP Request failed with status code: ' + res.getStatusCode() + ' ' + res.getBody());
                results.add('Error: ' + res.getStatusCode() + ' ' + res.getBody());
            }
        }
        
        return results;
    }

    public class SOSCaseUpdateRequest {
        @InvocableVariable(required=true description='mtcode of the case to update')
        public String mtcode;
        
        @InvocableVariable(required=false description='Reference for the case')
        public String refer;
        
        @InvocableVariable(required=false description='Description of the case')
        public String description;
        
        @InvocableVariable(required=true description='Archived status of the case')
        public Boolean archived;
    }
}
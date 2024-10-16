public class EmailSOSCaseQueueable implements Queueable, Database.AllowsCallouts {
    private List<BV_Case__c> casesToProcess;
    private Integer retryCount = 0;
    private List<Map<String, Object>> sosCaseData = new List<Map<String, Object>>(); // Store callout results temporarily

    // Constructor to pass in the list of accepted cases
    public EmailSOSCaseQueueable(List<BV_Case__c> casesToProcess, Integer retryCount) {
        this.casesToProcess = casesToProcess;
        this.retryCount = retryCount;
    }

    // This method will be invoked asynchronously
    public void execute(QueueableContext context) {
        // Process each case in the list
        for (BV_Case__c caseRecord : casesToProcess) {
            try {
                // Prepare the SOS case payload
                NewSOSCase sosCase = prepareSOSCase(caseRecord);

                // Perform the HTTP callout and store the response data
                Map<String, Object> calloutResponse = sendNewSOSCase(sosCase, caseRecord);
                
                if (calloutResponse != null) {
                    sosCaseData.add(calloutResponse); // Store the callout result (clcode and mtcode)
                }
            } catch (Exception e) {
                System.debug('Error creating SOS Case: ' + e.getMessage());
            }
        }

        // Enqueue a new job to handle updating the BV_Case__c records with clcode and mtcode
        if (!sosCaseData.isEmpty()) {
            System.enqueueJob(new UpdateBVCaseQueueable(sosCaseData));
        }
    }

    // Method to prepare the SOS case payload
    private NewSOSCase prepareSOSCase(BV_Case__c caseRecord) {
        NewSOSCase sosCase = new NewSOSCase();
        sosCase.mattertype = 'COMP';
        sosCase.mtcode = ''; // Set mtcode if needed
        sosCase.testmtcode = '21609809'; // Example test mtcode
        sosCase.ref = String.valueOf(caseRecord.Id); // Use the case Id as reference
        sosCase.description = 'Company Name - ' + String.valueOf(caseRecord.Reg_Name__c) + ', Company Number (' + String.valueOf(caseRecord.Company_No__c) + ')';
        sosCase.address_1 = String.valueOf(caseRecord.Reg_Office_Addr_1__c);
        sosCase.address_2 = String.valueOf(caseRecord.Reg_Office_Addr_2__c);
        sosCase.town = String.valueOf(caseRecord.Reg_Office_Addr_3__c);
        sosCase.county = String.valueOf(caseRecord.Reg_Office_Addr_4__c);
        sosCase.postcode = String.valueOf(caseRecord.Reg_Office_PC__c);
        sosCase.forename = '';
        sosCase.name = String.valueOf(caseRecord.Reg_Name__c);
        sosCase.pitype = 'OR';
        sosCase.clname = String.valueOf(caseRecord.Reg_Name__c);
        sosCase.clbranch = '001';
        sosCase.cltype = 'P';
        sosCase.clcode = '';

        return sosCase;
    }

    // Method to send the SOS case via HTTP callout
    private Map<String, Object> sendNewSOSCase(NewSOSCase sosCase, BV_Case__c caseRecord) {
        try {
            // Prepare the HTTP request
            HttpRequest req = new HttpRequest();
            req.setEndpoint('callout:BVSOSFinanceNamed'); // Your API endpoint (replace with actual endpoint)
            req.setMethod('PUT');
            req.setHeader('Content-Type', 'application/json');

            // Serialize the SOS case to JSON
            String jsonBody = JSON.serialize(sosCase);
            req.setBody(jsonBody);
            System.debug('Sending SOS Case Request: ' + jsonBody);

            // Send the request
            Http http = new Http();
            HttpResponse res = http.send(req);

            // Process the response
            if (res.getStatusCode() == 200) {
                System.debug('SOS Case created successfully. Response: ' + res.getBody());

                // Remove extra double quotes surrounding the JSON string (if present)
                String jsonString = res.getBody().removeStart('"').removeEnd('"');

                // Unescape the JSON string
                String unescapedJson = jsonString.replace('\\', '');

                // Parse the unescaped JSON response
                Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(unescapedJson);
                String clcode = (String) responseMap.get('clcode');
                String mtcode = (String) responseMap.get('mtcode');

                // Return the callout result with case ID, clcode, and mtcode
                return new Map<String, Object>{
                    'caseId' => caseRecord.Id,
                    'clcode' => clcode,
                    'mtcode' => mtcode
                };
            } else if (res.getStatusCode() == 503) {
                // If the service is unavailable (503), retry with delay if retries are remaining
                if (retryCount < 1) {
                    System.debug('503 Service Unavailable. Retrying... Attempt: ' + (retryCount + 1));
                    // Re-enqueue the job with an incremented retryCount
                    System.enqueueJob(new EmailSOSCaseQueueable(casesToProcess, retryCount + 1));
                } else {
                    System.debug('Max retries reached. Giving up on SOS case creation for this case.');
                }
            } else {
                System.debug('Failed to create SOS Case. Status Code: ' + res.getStatusCode() + ', Response: ' + res.getBody());
            }
        } catch (Exception e) {
            System.debug('Error creating SOS Case: ' + e.getMessage());
        }

        // In case of error or failure, return null
        return null;
    }

    // SOS Case class to represent the request payload
    public class NewSOSCase {
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
}
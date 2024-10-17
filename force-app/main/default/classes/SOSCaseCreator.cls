public class SOSCaseCreator {
    private static final String SOS_ENDPOINT = 'callout:BVSOSFinanceNamed';
    private static final Integer MAX_RETRIES = 2;

    public static SOSCaseResponse createNewSOSCase(CreateSOSCase.SOSCaseRequest reqData) {
        NewSOSCase r = prepareNewSOSCase(reqData);
        return sendSOSRequest(r);
    }

    private static NewSOSCase prepareNewSOSCase(CreateSOSCase.SOSCaseRequest reqData) {
        NewSOSCase r = new NewSOSCase();
        r.mtcode = '';
        r.mattertype = reqData.mattertype;

        if (r.mattertype == 'COMP') {
            prepareCompanyCase(r, reqData);
        } else if (r.mattertype == 'ESTA') {
            prepareEstateCase(r, reqData);
        }

        r.ref = reqData.CaseID;
        r.clcode = '';
        r.testmtcode = '21609809';

        return r;
    }

    private static void prepareCompanyCase(NewSOSCase r, CreateSOSCase.SOSCaseRequest reqData) {
        r.description = 'Company Name - ' + reqData.CompanyName + ', Case Officer reference (' + reqData.CaseOfficerRef + '), ' + ', Dissolution Date ' + reqData.DissolutionDate + ', Company Number (' + reqData.CompanyNumber + ')';
        r.address_1 = reqData.AddressLine1;
        r.address_2 = reqData.AddressLine2;
        r.town = reqData.Town;
        r.county = reqData.Country;
        r.postcode = reqData.Postcode;
        r.name = reqData.CompanyName;
        r.pitype = 'OR';
        r.clname = reqData.CompanyName;
        r.clbranch = '001';
        r.cltype = 'COMP Companies';
    }

    private static void prepareEstateCase(NewSOSCase r, CreateSOSCase.SOSCaseRequest reqData) {
        r.description = 'Decd Surname - ' + reqData.DecdSurname + ', Case Officer Ref (' + reqData.CaseOfficerRef + '), Date of Death ' + reqData.DateOfDeath + ', Short Place ' + reqData.ShortPlace + ', at ' + reqData.AddressLine1;
        r.address_1 = reqData.AddressLine1;
        r.address_2 = reqData.AddressLine2;
        r.town = reqData.Town;
        r.county = reqData.Country;
        r.postcode = reqData.Postcode;
        r.forename = reqData.DecdForenames;
        r.name = reqData.DecdSurname;
        r.pitype = 'OR';
        r.clname = reqData.Title + ' ' + reqData.DecdForenames + ' ' + reqData.DecdSurname;
        r.clbranch = '001';
        r.cltype = 'ESTA Estates';
    }

    private static SOSCaseResponse sendSOSRequest(NewSOSCase r) {
        Integer retryCount = 0;
        SOSCaseResponse response = new SOSCaseResponse();

        while (retryCount < MAX_RETRIES) {
            try {
                HttpRequest req = prepareHttpRequest(r);
                HttpResponse res = new Http().send(req);

                if (res.getStatusCode() == 200) {
                    processSuccessResponse(res, response);
                    return response;
                } else if (res.getStatusCode() == 503) {
                    System.debug('Service Unavailable (503). Retrying request...');
                    retryCount++;
                } else {
                    response.errorMessage = 'Error: ' + res.getStatusCode() + ' - ' + res.getStatus();
                    return response;
                }
            } catch (Exception e) {
                response.errorMessage = 'Error: ' + e.getMessage();
                return response;
            }
        }

        response.errorMessage = 'Error: Max retries reached';
        return response;
    }

    private static HttpRequest prepareHttpRequest(NewSOSCase r) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(SOS_ENDPOINT);
        req.setMethod('PUT');
        req.setHeader('Content-Type', 'application/json');
        req.setBody(JSON.serialize(r));
        return req;
    }

    private static void processSuccessResponse(HttpResponse res, SOSCaseResponse response) {
        String jsonString = res.getBody().removeStart('"').removeEnd('"');
        String unescapedJson = jsonString.replace('\\', '');
        Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(unescapedJson);
        response.clcode = (String) responseMap.get('clcode');
        response.mtcode = (String) responseMap.get('mtcode');
        System.debug('Response: ' + responseMap);
        System.debug('CLCode: ' + response.clcode);
        System.debug('MTCode: ' + response.mtcode);
    }

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

    public class SOSCaseResponse {
        public String clcode;
        public String mtcode;
        public String errorMessage;
    }
}
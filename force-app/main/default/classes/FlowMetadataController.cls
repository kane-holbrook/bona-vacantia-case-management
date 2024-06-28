public with sharing class FlowMetadataController {
    @AuraEnabled(cacheable=true)
    public static List<FlowStepInfo> getFlowMetadata(String flowApiName) {
        List<FlowStepInfo> stepInfos = new List<FlowStepInfo>();

        String baseUrl = 'callout:Apex_Metadata_API_Named';
        String toolingEndpoint = '/services/data/v59.0/tooling/query/?q=';
        String query = 'SELECT Id, FullName, Metadata FROM Flow WHERE Definition.DeveloperName = \'' + flowApiName + '\'';

        HttpRequest req = new HttpRequest();
        req.setEndpoint(baseUrl + toolingEndpoint + EncodingUtil.urlEncode(query, 'UTF-8'));
        req.setMethod('GET');
        req.setHeader('Authorization', 'Bearer ' + UserInfo.getSessionId());

        Http http = new Http();
        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            Map<String, Object> results = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            List<Object> records = (List<Object>) results.get('records');

            for (Object recordObj : records) {
                Map<String, Object> record = (Map<String, Object>) recordObj;
                Map<String, Object> metadata = (Map<String, Object>) record.get('Metadata');
                List<Object> screens = (List<Object>) metadata.get('screens');

                // Sort screens by locationY and locationX
                screens.sort(new ScreenComparator());

                for (Object screenObj : screens) {
                    Map<String, Object> screen = (Map<String, Object>) screenObj;
                    String label = (String) screen.get('label');
                    stepInfos.add(new FlowStepInfo(label));
                }
            }
        } else {
            throw new CalloutException('Error querying Tooling API: ' + res.getBody());
        }

        return stepInfos;
    }

    public class FlowStepInfo {
        @AuraEnabled
        public String label;

        public FlowStepInfo(String label) {
            this.label = label;
        }
    }

    public class ScreenComparator implements Comparator<Object> {
        public Integer compare(Object screenAObj, Object screenBObj) {
            Map<String, Object> screenA = (Map<String, Object>) screenAObj;
            Map<String, Object> screenB = (Map<String, Object>) screenBObj;

            Integer yA = (Integer) screenA.get('locationY');
            Integer yB = (Integer) screenB.get('locationY');
            if (yA == null || yB == null) {
                return 0;
            }
            if (yA != yB) {
                return yA > yB ? 1 : -1;
            }

            Integer xA = (Integer) screenA.get('locationX');
            Integer xB = (Integer) screenB.get('locationX');
            if (xA == null || xB == null) {
                return 0;
            }
            return xA > xB ? 1 : -1;
        }
    }
}
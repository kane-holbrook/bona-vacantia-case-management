public with sharing class FlowMetadataController {
    @AuraEnabled(cacheable=true)
    public static List<FlowStepInfo> getFlowMetadata(String flowApiName, String caseType) {
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

            System.debug('records: ' + records);

            for (Object recordObj : records) {
                Map<String, Object> record = (Map<String, Object>) recordObj;
                Map<String, Object> metadata = (Map<String, Object>) record.get('Metadata');
                List<Object> screens = (List<Object>) metadata.get('screens');
                List<Object> decisions = (List<Object>) metadata.get('decisions');

                // Create a map of screens for easy lookup
                Map<String, Map<String, Object>> screenMap = new Map<String, Map<String, Object>>();
                for (Object screenObj : screens) {
                    Map<String, Object> screen = (Map<String, Object>) screenObj;
                    String name = (String) screen.get('name');
                    screenMap.put(name, screen);
                }

                // Create a map of decisions for easy lookup
                Map<String, Map<String, Object>> decisionMap = new Map<String, Map<String, Object>>();
                for (Object decisionObj : decisions) {
                    Map<String, Object> decision = (Map<String, Object>) decisionObj;
                    String name = (String) decision.get('name');
                    decisionMap.put(name, decision);
                }

                // Start with the first screen
                String currentScreen = 'Disclosure';
                while (currentScreen != null) {
                    if (screenMap.containsKey(currentScreen)) {
                        Map<String, Object> screen = screenMap.get(currentScreen);
                        String label = (String) screen.get('label');
                        stepInfos.add(new FlowStepInfo(label));

                        // Determine the next screen
                        Map<String, Object> connector = (Map<String, Object>) screen.get('connector');
                        if (connector != null) {
                            currentScreen = (String) connector.get('targetReference');
                        } else {
                            currentScreen = null;
                        }
                    } else if (decisionMap.containsKey(currentScreen)) {
                        Map<String, Object> decision = decisionMap.get(currentScreen);
                        currentScreen = processDecisions(decision, caseType);
                    } else {
                        currentScreen = null;
                    }
                }
            }
        } else {
            throw new CalloutException('Error querying Tooling API: ' + res.getBody());
        }

        return stepInfos;
    }

    private static String processDecisions(Map<String, Object> decision, String caseType) {
        List<Object> rules = (List<Object>) decision.get('rules');

        for (Object ruleObj : rules) {
            Map<String, Object> rule = (Map<String, Object>) ruleObj;
            List<Object> conditions = (List<Object>) rule.get('conditions');

            for (Object conditionObj : conditions) {
                Map<String, Object> condition = (Map<String, Object>) conditionObj;
                Map<String, Object> rightValue = (Map<String, Object>) condition.get('rightValue');

                if (rightValue != null && rightValue.containsKey('elementReference')) {
                    String elementReference = (String) rightValue.get('elementReference');

                    if (elementReference != null && elementReference.equals(caseType)) {
                        Map<String, Object> connector = (Map<String, Object>) rule.get('connector');
                        return (String) connector.get('targetReference');
                    }
                }
            }
        }

        // Default connector if no rules match
        Map<String, Object> defaultConnector = (Map<String, Object>) decision.get('defaultConnector');
        if (defaultConnector != null) {
            return (String) defaultConnector.get('targetReference');
        }

        return null;
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
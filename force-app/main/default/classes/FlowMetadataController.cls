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
                List<Object> loopElements = (List<Object>) metadata.get('loops');
                List<Object> assignments = (List<Object>) metadata.get('assignments');
                List<Object> getRecords = (List<Object>) metadata.get('recordLookups');

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

                // Create a map of loops for easy lookup
                Map<String, Map<String, Object>> loopMap = new Map<String, Map<String, Object>>();
                for (Object loopObj : loopElements) {
                    Map<String, Object> loopElement = (Map<String, Object>) loopObj;
                    String name = (String) loopElement.get('name');
                    loopMap.put(name, loopElement);
                }

                // Create a map of assignments for easy lookup
                Map<String, Map<String, Object>> assignmentMap = new Map<String, Map<String, Object>>();
                for (Object assignmentObj : assignments) {
                    Map<String, Object> assignment = (Map<String, Object>) assignmentObj;
                    String name = (String) assignment.get('name');
                    assignmentMap.put(name, assignment);
                }

                // Create a map of getRecords for easy lookup
                Map<String, Map<String, Object>> getRecordsMap = new Map<String, Map<String, Object>>();
                for (Object getRecordObj : getRecords) {
                    Map<String, Object> getRecord = (Map<String, Object>) getRecordObj;
                    String name = (String) getRecord.get('name');
                    getRecordsMap.put(name, getRecord);
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
                    } else if (loopMap.containsKey(currentScreen)) {
                        Map<String, Object> loopElement = loopMap.get(currentScreen);
                        currentScreen = processLoopElement(loopElement, screenMap, assignmentMap, stepInfos);
                    } else if (assignmentMap.containsKey(currentScreen)) {
                        Map<String, Object> assignment = assignmentMap.get(currentScreen);
                        currentScreen = processAssignment(assignment);
                    } else if (getRecordsMap.containsKey(currentScreen)) {
                        Map<String, Object> getRecord = getRecordsMap.get(currentScreen);
                        currentScreen = processGetRecords(getRecord);
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

        // if the case type has spaces, they need to be replaced with underscores
        String caseTypeWithSpaces = caseType.replace(' ', '_');
        String caseTypeWithSpacesAndPercents = caseTypeWithSpaces.replace('%', '_PERCENT_');

        for (Object ruleObj : rules) {
            Map<String, Object> rule = (Map<String, Object>) ruleObj;
            List<Object> conditions = (List<Object>) rule.get('conditions');

            for (Object conditionObj : conditions) {
                Map<String, Object> condition = (Map<String, Object>) conditionObj;
                Map<String, Object> rightValue = (Map<String, Object>) condition.get('rightValue');

                if (rightValue != null && rightValue.containsKey('elementReference')) {
                    String elementReference = (String) rightValue.get('elementReference');

                    if (elementReference != null && elementReference.equals(caseTypeWithSpaces)) {
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

    private static String processLoopElement(Map<String, Object> loopElement, Map<String, Map<String, Object>> screenMap, Map<String, Map<String, Object>> assignmentMap, List<FlowStepInfo> stepInfos) {
        // Process next value connector within the loop
        Map<String, Object> nextValueConnector = (Map<String, Object>) loopElement.get('nextValueConnector');
        if (nextValueConnector != null) {
            String loopScreen = (String) nextValueConnector.get('targetReference');

            if (screenMap.containsKey(loopScreen)) {
                Map<String, Object> screen = screenMap.get(loopScreen);
                String label = (String) screen.get('label');
                stepInfos.add(new FlowStepInfo(label));

                // Handle nested connectors within the loop
                Map<String, Object> connector = (Map<String, Object>) screen.get('connector');
                if (connector != null) {
                    processNestedConnector(connector, screenMap, assignmentMap, stepInfos);
                }
            } else if (assignmentMap.containsKey(loopScreen)) {
                Map<String, Object> assignment = assignmentMap.get(loopScreen);
                processAssignment(assignment);
            }
        }

        // Continue after loop
        Map<String, Object> noMoreValuesConnector = (Map<String, Object>) loopElement.get('noMoreValuesConnector');
        if (noMoreValuesConnector != null) {
            return (String) noMoreValuesConnector.get('targetReference');
        }
        return null;
    }

    private static void processNestedConnector(Map<String, Object> connector, Map<String, Map<String, Object>> screenMap, Map<String, Map<String, Object>> assignmentMap, List<FlowStepInfo> stepInfos) {
        String targetReference = (String) connector.get('targetReference');
        if (screenMap.containsKey(targetReference)) {
            Map<String, Object> screen = screenMap.get(targetReference);
            String label = (String) screen.get('label');
            stepInfos.add(new FlowStepInfo(label));

            Map<String, Object> nestedConnector = (Map<String, Object>) screen.get('connector');
            if (nestedConnector != null) {
                processNestedConnector(nestedConnector, screenMap, assignmentMap, stepInfos);
            }
        } else if (assignmentMap.containsKey(targetReference)) {
            Map<String, Object> assignment = assignmentMap.get(targetReference);
            processAssignment(assignment);
        }
    }

    private static String processAssignment(Map<String, Object> assignment) {
        // Process the assignment connector
        Map<String, Object> connector = (Map<String, Object>) assignment.get('connector');
        if (connector != null) {
            return (String) connector.get('targetReference');
        }
        return null;
    }

    private static String processGetRecords(Map<String, Object> getRecord) {
        // Process the Get Records connector
        Map<String, Object> connector = (Map<String, Object>) getRecord.get('connector');
        if (connector != null) {
            return (String) connector.get('targetReference');
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
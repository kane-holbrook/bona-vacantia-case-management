public class BV_CaseTriggerHandler {
    
        private static Map<String, User> getUserMapping() {
            Map<String, User> usernameToUserMap = new Map<String, User>();
            for (User u : [SELECT Username, Id FROM User]) {
                usernameToUserMap.put(u.Username, u);
            }
            return usernameToUserMap;
        }
    
        private static Map<String, List<Stage_Task__mdt>> getStageTaskMap() {
            Map<String, List<Stage_Task__mdt>> stageTaskMap = new Map<String, List<Stage_Task__mdt>>();
            for (Stage_Task__mdt stageTask : [SELECT Stage__c, Due_Date_Offset__c, Title__c, Assignee_Username__c, Mandatory__c FROM Stage_Task__mdt]) {
                if (!stageTaskMap.containsKey(stageTask.Stage__c)) {
                    stageTaskMap.put(stageTask.Stage__c, new List<Stage_Task__mdt>());
                }
                stageTaskMap.get(stageTask.Stage__c).add(stageTask);
            }
            return stageTaskMap;
        }
    
        private static Map<Id, List<Task>> getCaseToTasksMap(List<BV_Case__c> cases) {
            Map<Id, List<Task>> caseToTasksMap = new Map<Id, List<Task>>();
            for (Task t : [SELECT Id, WhatId, Subject, Status FROM Task WHERE WhatId IN :cases]) {
                if (!caseToTasksMap.containsKey(t.WhatId)) {
                    caseToTasksMap.put(t.WhatId, new List<Task>());
                }
                caseToTasksMap.get(t.WhatId).add(t);
            }
            return caseToTasksMap;
        }
    
        public static void handleTaskCreationForNewCases(List<BV_Case__c> newCases) {
        Map<String, User> usernameToUserMap = getUserMapping();
        Map<String, List<Stage_Task__mdt>> stageTaskMap = getStageTaskMap();
        Map<Id, List<Task>> caseToTasksMap = getCaseToTasksMap(newCases);
    
        List<Task> tasksToInsert = new List<Task>();
        for (BV_Case__c bvCase : newCases) {
            if (stageTaskMap.containsKey(bvCase.Stage__c)) {
                List<Task> existingTasksForCase = caseToTasksMap.get(bvCase.Id);
                if(existingTasksForCase == null) {
                    existingTasksForCase = new List<Task>();
                }
    
                for (Stage_Task__mdt taskMetadata : stageTaskMap.get(bvCase.Stage__c)) {
                    Boolean taskExists = false;
                    for (Task existingTask : existingTasksForCase) {
                        if (existingTask.Subject == taskMetadata.Title__c) {
                            taskExists = true;
                            break;
                        }
                    }
    
                    if (!taskExists) {
                        Id assigneeId = bvCase.OwnerId; // default to BV_Case owner
                        if (taskMetadata.Assignee_Username__c != null && usernameToUserMap.containsKey(taskMetadata.Assignee_Username__c)) {
                            assigneeId = usernameToUserMap.get(taskMetadata.Assignee_Username__c).Id;
                        }
    
                        Task newTask = new Task(
                            WhatId = bvCase.Id,
                            Subject = taskMetadata.Title__c,
                            ActivityDate = Date.today().addDays(Integer.valueOf(taskMetadata.Due_Date_Offset__c)),
                            OwnerId = assigneeId
                        );
                        tasksToInsert.add(newTask);
                    }
                }
            }
        }
    
        // Insert tasks
        if (!tasksToInsert.isEmpty()) {
            insert tasksToInsert;
        }
    }

    public static void handleTaskCreation(List<BV_Case__c> newCases, Map<Id, BV_Case__c> oldMap) {
        Map<String, User> usernameToUserMap = getUserMapping();
        Map<String, List<Stage_Task__mdt>> stageTaskMap = getStageTaskMap();
        Map<Id, List<Task>> caseToTasksMap = getCaseToTasksMap(newCases);

        List<Task> tasksToInsert = new List<Task>();
        for (BV_Case__c bvCase : newCases) {
            BV_Case__c oldBVCase = oldMap.get(bvCase.Id);
            if (bvCase.Stage__c != oldBVCase.Stage__c && stageTaskMap.containsKey(bvCase.Stage__c)) {
                List<Task> existingTasksForCase = caseToTasksMap.get(bvCase.Id);
                if(existingTasksForCase == null) {
                    existingTasksForCase = new List<Task>();
                }

                for (Stage_Task__mdt taskMetadata : stageTaskMap.get(bvCase.Stage__c)) {
                    Boolean taskExists = false;
                    for (Task existingTask : existingTasksForCase) {
                        if (existingTask.Subject == taskMetadata.Title__c) {
                            taskExists = true;
                            break;
                        }
                    }

                    if (!taskExists) {
                        Id assigneeId = bvCase.OwnerId; // default to BV_Case owner
                        if (taskMetadata.Assignee_Username__c != null && usernameToUserMap.containsKey(taskMetadata.Assignee_Username__c)) {
                            assigneeId = usernameToUserMap.get(taskMetadata.Assignee_Username__c).Id;
                        }

                        Task newTask = new Task(
                            WhatId = bvCase.Id,
                            Subject = taskMetadata.Title__c,
                            ActivityDate = Date.today().addDays(Integer.valueOf(taskMetadata.Due_Date_Offset__c)),
                            OwnerId = assigneeId
                        );
                        tasksToInsert.add(newTask);
                    }
                }
            }
        }

        // Insert tasks
        if (!tasksToInsert.isEmpty()) {
            insert tasksToInsert;
        }
    }

    public static void handleTaskVerification(List<BV_Case__c> newCases) {
        // Fetch previous values for cases
        Set<Id> caseIds = new Set<Id>();
        for(BV_Case__c c : newCases) {
            caseIds.add(c.Id);
        }
        
        Map<Id, BV_Case__c> oldCaseMap = new Map<Id, BV_Case__c>([SELECT Id, Stage__c FROM BV_Case__c WHERE Id IN :caseIds]);
    
        Map<String, User> usernameToUserMap = getUserMapping();
        Map<String, List<Stage_Task__mdt>> stageTaskMap = getStageTaskMap();
    
        // Verification
        for (BV_Case__c bvCase : newCases) {
            BV_Case__c oldBVCase = oldCaseMap.get(bvCase.Id);
            
            // Ensure that all mandatory tasks of the old stage are completed
            if (bvCase.Stage__c != oldBVCase.Stage__c && stageTaskMap.containsKey(oldBVCase.Stage__c)) {
                List<Task> tasksForCase = [SELECT Id, WhatId, Subject, Status FROM Task WHERE WhatId = :bvCase.Id AND Status != 'Completed']; 
                List<Stage_Task__mdt> stageTasksMetadata = stageTaskMap.get(oldBVCase.Stage__c);
    
                List<String> incompleteMandatoryTasks = new List<String>(); // Store titles of incomplete mandatory tasks
            
                for (Stage_Task__mdt taskMeta : stageTasksMetadata) {
                    if (taskMeta.Mandatory__c) {
                        Boolean taskExistsAndIncomplete = false;
                        for (Task t : tasksForCase) {
                            if (t.Subject == taskMeta.Title__c) {
                                taskExistsAndIncomplete = true;
                                break;
                            }
                        }
                        if (taskExistsAndIncomplete) {
                            incompleteMandatoryTasks.add(taskMeta.Title__c);
                        }
                    }
                }
    
                // Add a consolidated error message if there are any incomplete mandatory tasks
                if (!incompleteMandatoryTasks.isEmpty()) {
                    String errorMessage = 'You need to complete the following mandatory tasks before moving to the stage: ' + bvCase.Stage__c + ': ' + String.join(incompleteMandatoryTasks, ', ');
                    bvCase.addError(errorMessage);
                }
            }
        }
    }
}
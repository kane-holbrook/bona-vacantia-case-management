public with sharing class TaskController {
    @AuraEnabled(cacheable=true)
    public static List<BV_Task__c> getTasksByCaseId(Id caseId) {
        return [
            SELECT Id, Name, Assigned_To__c, Due_Date__c, Date_Inserted__c, Description__c, Priority__c, Last_updated__c,
                   (SELECT Id, Name, Assigned_To__c, Due_Date__c, Date_Inserted__c, Description__c, Priority__c, Last_updated__c, Waiting_Period_Data__c
                    FROM BV_Tasks1__r)
            FROM BV_Task__c
            WHERE BV_Case_Lookup__c = :caseId
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<BV_Task__c> getSubTasks(Id parentTaskId) {
        return [
            SELECT Id, Name, Assigned_To__c, Due_Date__c, Date_Inserted__c, Priority__c, Comments__c, Last_updated__c, Waiting_Period_Data__c
            FROM BV_Task__c
            WHERE Parent_Task__c = :parentTaskId
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<User> getUsers() {
        return [SELECT Id, Name FROM User];
    }

    @AuraEnabled(cacheable=true)
    public static List<BV_Task__c> getOpenTasksByUser(Id userId) {
        return [
            SELECT Id, Name, Due_Date__c, Date_Inserted__c, Description__c, Priority__c, Assigned_To__c, BV_Case_Lookup__c, Complete__c, Last_updated__c,
                (SELECT Id, Name, Due_Date__c, Date_Inserted__c, Description__c, Priority__c, Assigned_To__c, Complete__c, Last_updated__c, Waiting_Period_Data__c
                    FROM BV_Tasks1__r)
            FROM BV_Task__c
            WHERE Assigned_To__c = :userId AND Complete__c = False
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<BV_Task__c> getOtherTasksByCaseId(Id caseId, Id userId) {
        return [
            SELECT Id, Name, Assigned_To__c, Due_Date__c, Date_Inserted__c, Description__c, Priority__c, Last_updated__c,
                (SELECT Id, Name, Assigned_To__c, Due_Date__c, Date_Inserted__c, Description__c, Priority__c, Last_updated__c, Waiting_Period_Data__c
                    FROM BV_Tasks1__r)
            FROM BV_Task__c
            WHERE BV_Case_Lookup__c = :caseId AND Assigned_To__c != :userId
        ];
    }

    
    @AuraEnabled(cacheable=true)
    public static BV_Task__c getTaskById(Id taskId) {
        return [
            SELECT Id, Name, Assigned_To__c, Due_Date__c, Date_Inserted__c, Description__c, Priority__c, Schedule_Code__c,
                   Category__c, Group_Code__c, Other_party__c, Last_updated__c, Comments__c, Waiting_Period_Data__c
            FROM BV_Task__c
            WHERE Id = :taskId
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<User> searchUsers(String searchTerm) {
        String searchPattern = '%' + searchTerm + '%';
        return [
            SELECT Id, Name 
            FROM User 
            WHERE Name LIKE :searchPattern 
            AND IsActive = true
            LIMIT 50
        ];
    }

    @AuraEnabled(cacheable=true)
    public static User getCurrentUser() {
        return [
            SELECT Id, Name 
            FROM User 
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];
    }

    @AuraEnabled(cacheable=true)
    public static User getCaseOwnerByCaseId(Id caseId) {
        BV_Case__c caseRecord = [
            SELECT OwnerId, Owner.Name 
            FROM BV_Case__c 
            WHERE Id = :caseId 
            LIMIT 1
        ];
        return [
            SELECT Id, Name 
            FROM User 
            WHERE Id = :caseRecord.OwnerId 
            LIMIT 1
        ];
    }

    @InvocableMethod(label='Calculate Date')
    public static List<Date> calculateDate(List<String> inputs) {
        List<Date> resultDates = new List<Date>();

        for (String input : inputs) {
            // Get the current date
            Date currentDate = Date.today();
            Date resultDate = currentDate;

            // Parse the input string
            Pattern pattern = Pattern.compile('(After|Before) (\\d+) (Working Days|Days|Weeks|Months|Years)');
            Matcher matcher = pattern.matcher(input);

            if (matcher.matches()) {
                String direction = matcher.group(1);
                Integer amount = Integer.valueOf(matcher.group(2));
                String unit = matcher.group(3);

                // Determine the sign based on direction
                Integer sign = direction == 'After' ? 1 : -1;

                // Calculate the result date based on the unit
                if (unit == 'Working Days') {
                    resultDate = addWorkingDays(currentDate, sign * amount);
                } else if (unit == 'Days') {
                    resultDate = currentDate.addDays(sign * amount);
                } else if (unit == 'Weeks') {
                    resultDate = currentDate.addDays(sign * amount * 7);
                } else if (unit == 'Months') {
                    resultDate = currentDate.addMonths(sign * amount);
                } else if (unit == 'Years') {
                    resultDate = currentDate.addYears(sign * amount);
                }
            }

            resultDates.add(resultDate);
        }

        return resultDates;
    }

    private static Date addWorkingDays(Date startDate, Integer workingDays) {
        Integer addedDays = 0;
        Date resultDate = startDate;

        while (addedDays < Math.abs(workingDays)) {
            resultDate = workingDays > 0 ? resultDate.addDays(1) : resultDate.addDays(-1);
            if (resultDate.toStartOfWeek() != resultDate && resultDate.toStartOfWeek().addDays(6) != resultDate) { // Skip weekends
                addedDays++;
            }
        }

        return resultDate;
    }
}
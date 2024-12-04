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
            Date startDate = Date.today(); // Default to today
            
            // Updated pattern to be more flexible with whitespace
            // Uses \s+ to match one or more whitespace characters
            Pattern pattern = Pattern.compile('(?:(\\d{1,2}\\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4})\\s+)?(After|Before)\\s+(\\d+)\\s+(Working Days|Days|Weeks|Months|Years)');
            Matcher matcher = pattern.matcher(input);

            if (matcher.matches()) {
                // If date group exists, parse it
                if (matcher.group(1) != null) {
                    try {
                        startDate = Date.parse(matcher.group(1).trim());
                    } catch (Exception e) {
                        // If date parsing fails, default to today
                        startDate = Date.today();
                    }
                }

                String direction = matcher.group(2);
                Integer amount = Integer.valueOf(matcher.group(3));
                String unit = matcher.group(4);

                // Determine the sign based on direction
                Integer sign = direction == 'After' ? 1 : -1;

                // Calculate the result date based on the unit
                Date resultDate = startDate;
                
                if (unit == 'Working Days') {
                    resultDate = addWorkingDays(startDate, sign * amount);
                } else if (unit == 'Days') {
                    resultDate = startDate.addDays(sign * amount);
                } else if (unit == 'Weeks') {
                    resultDate = startDate.addDays(sign * amount * 7);
                } else if (unit == 'Months') {
                    resultDate = startDate.addMonths(sign * amount);
                } else if (unit == 'Years') {
                    resultDate = startDate.addYears(sign * amount);
                }
                
                resultDates.add(resultDate);
            } else {
                // If pattern doesn't match, add the original start date
                resultDates.add(startDate);
            }
        }

        return resultDates;
    }

    private static Date addWorkingDays(Date startDate, Integer workingDays) {
        Date resultDate = startDate;
    
        // Check if the start date is a weekend, if so, adjust to the next working day
        Integer startDayOfWeek = resultDate.toStartOfWeek().addDays(0).daysBetween(resultDate) + 1;
        while (startDayOfWeek == 6 || startDayOfWeek == 7) { // 6 = Saturday, 7 = Sunday
            resultDate = workingDays > 0 ? resultDate.addDays(1) : resultDate.addDays(-1);
            startDayOfWeek = resultDate.toStartOfWeek().addDays(0).daysBetween(resultDate) + 1;
        }
    
        Integer addedDays = 1; // Start from 1 since we include the first valid day
        while (addedDays < Math.abs(workingDays)) {
            resultDate = workingDays > 0 ? resultDate.addDays(1) : resultDate.addDays(-1);
    
            // Check if the day is not a weekend (Saturday or Sunday)
            Integer dayOfWeek = resultDate.toStartOfWeek().addDays(0).daysBetween(resultDate) + 1;
            if (dayOfWeek != 6 && dayOfWeek != 7) {
                addedDays++;
            }
        }
    
        // Ensure the final date is not a weekend
        Integer finalDayOfWeek = resultDate.toStartOfWeek().addDays(0).daysBetween(resultDate) + 1;
        while (finalDayOfWeek == 6 || finalDayOfWeek == 7) {
            resultDate = workingDays > 0 ? resultDate.addDays(1) : resultDate.addDays(-1);
            finalDayOfWeek = resultDate.toStartOfWeek().addDays(0).daysBetween(resultDate) + 1;
        }
    
        return resultDate;
    }
}
public class CaseCreationCalculateDate {
    @InvocableMethod(label='Calculate Case Creation Date')
    public static List<Date> calculateTargetDate(List<String> inputs) {
        List<Date> resultDates = new List<Date>();
        
        for (String input : inputs) {
            // Split the input string
            List<String> parts = input.split(',');
            if (parts.size() != 2) {
                // Handle invalid input
                throw new IllegalArgumentException('Error: Invalid input format. Expected format "After 20 Working Days, 3 December 2024".');
            }

            try {
                // Parse the working days
                String workingDaysPart = parts[0].trim();
                if (!workingDaysPart.startsWith('After')) {
                    throw new IllegalArgumentException('Error: Input should start with "After".');
                }
                Integer workingDays = Integer.valueOf(workingDaysPart.replace('After', '').replace('Working Days', '').trim());

                // Parse the received date
                String receivedDatePart = parts[1].trim();
                Date receivedDate = parseCustomDate(receivedDatePart);

                // Calculate the target date
                Date targetDate = calculateTargetDateHelper(workingDays, receivedDate);

                // Add the result to the list
                resultDates.add(targetDate);
            } catch (Exception e) {
                // Handle error (optional logging or rethrowing)
                throw new IllegalArgumentException('Error: ' + e.getMessage());
            }
        }
        
        return resultDates;
    }

    // Helper method for calculation
    private static Date calculateTargetDateHelper(Integer workingDays, Date receivedDate) {
        return addWorkingDays(receivedDate, workingDays);
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
    
    

    // Method to parse custom date format
    private static Date parseCustomDate(String customDate) {
        // Example input: "3 December 2024"
        List<String> dateParts = customDate.split(' ');
        if (dateParts.size() != 3) {
            throw new IllegalArgumentException('Error: Invalid date format. Expected format "3 December 2024".');
        }
        
        // Extract day, month, and year
        Integer day = Integer.valueOf(dateParts[0]);
        String month = dateParts[1];
        Integer year = Integer.valueOf(dateParts[2]);

        // Convert the month name to a number
        Map<String, Integer> monthMap = new Map<String, Integer>{
            'January' => 1, 'February' => 2, 'March' => 3, 'April' => 4,
            'May' => 5, 'June' => 6, 'July' => 7, 'August' => 8,
            'September' => 9, 'October' => 10, 'November' => 11, 'December' => 12
        };
        
        if (!monthMap.containsKey(month)) {
            throw new IllegalArgumentException('Error: Invalid month name "' + month + '".');
        }
        Integer monthNumber = monthMap.get(month);

        // Construct the date string in YYYY-MM-DD format
        String dateString = year + '-' + monthNumber.format() + '-' + day.format();
        return Date.valueOf(dateString);
    }
}
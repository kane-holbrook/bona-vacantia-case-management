public class LegacyIdExtractor {

    @InvocableMethod(label='Get Legacy ID' description='Extracts ID from case subject format ####/ID and converts it to a number')
    public static List<Decimal> getLegacyId(List<String> caseSubjects) {
        List<Decimal> legacyIds = new List<Decimal>();

        for (String subject : caseSubjects) {
            if (subject != null && subject.contains('/')) {
                // Splits the string based on '/' and gets the ID part
                String[] parts = subject.split('/');
                if (parts.size() > 1) {
                    try {
                        // Convert the ID part to a Decimal and add to the list
                        Decimal id = Decimal.valueOf(parts[1].trim());
                        legacyIds.add(id);
                    } catch (Exception e) {
                        legacyIds.add(null); // Handle non-numeric IDs gracefully
                    }
                } else {
                    legacyIds.add(null); // Handle cases where no ID is found
                }
            } else {
                legacyIds.add(null); // Handle null or incorrectly formatted strings
            }
        }

        return legacyIds;
    }
}
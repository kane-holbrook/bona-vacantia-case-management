global class CSVEmailHandler implements Messaging.InboundEmailHandler {
    global Messaging.InboundEmailResult handleInboundEmail(Messaging.InboundEmail email, Messaging.InboundEnvelope envelope) {
        Messaging.InboundEmailResult result = new Messaging.InboundEmailResult();

        if (email == null) {
            System.debug('Inbound email is null');
            result.success = false;
            return result;
        }

        if (email.binaryAttachments == null || email.binaryAttachments.isEmpty()) {
            System.debug('No binary attachments found');
            result.success = true;
            return result;
        }

        // Find the CSV attachment
        Messaging.InboundEmail.BinaryAttachment csvAttachment = null;
        for (Messaging.InboundEmail.BinaryAttachment attachment : email.binaryAttachments) {
            if (attachment != null && (attachment.mimeTypeSubType == 'csv' || attachment.fileName.endsWith('.csv'))) {
                csvAttachment = attachment;
                break;
            }
        }

        if (csvAttachment != null) {
            // Convert the CSV file content to a string
            String csvContent = csvAttachment.body.toString();
            
            // Parse the CSV and create cases
            List<String> errorMessages = new List<String>();
            List<BV_Case__c> casesToCreate = parseCSV(csvContent, errorMessages);

            if (errorMessages.isEmpty() && !casesToCreate.isEmpty()) {
                insert casesToCreate;
                sendSuccessEmail(email.fromAddress);
            } else {
                sendErrorEmail(email.fromAddress, errorMessages);
                result.success = false;
                return result;
            }
        } else {
            System.debug('No CSV attachment found');
        }

        result.success = true;
        return result;
    }

    private List<BV_Case__c> parseCSV(String csvContent, List<String> errorMessages) {
        List<BV_Case__c> cases = new List<BV_Case__c>();
        List<String> csvLines = csvContent.split('\n');

        for (Integer i = 1; i < csvLines.size(); i++) {
            String line = csvLines[i];
            List<String> columns = parseCSVLine(line);

            if (columns.size() >= 5) {
                BV_Case__c caseRecord = new BV_Case__c();
                Boolean isValid = true;

                try {
                    caseRecord.Company_No__c = Integer.valueOf(columns[0]);
                } catch (Exception e) {
                    errorMessages.add('Row ' + i + ': Error converting Company_No__c to Integer: ' + columns[0]);
                    isValid = false;
                }

                try {
                    caseRecord.Date_Dissolved__c = Date.valueOf(columns[1]);
                } catch (Exception e) {
                    errorMessages.add('Row ' + i + ': Error converting Date_Dissolved__c to Date: ' + columns[1]);
                    isValid = false;
                }

                caseRecord.Rm_Reference__c = columns[2];
                caseRecord.Case_Name__c = columns[3];

                try {
                    caseRecord.Date_Received__c = Date.valueOf(columns[4]);
                } catch (Exception e) {
                    errorMessages.add('Row ' + i + ': Error converting Date_Received__c to Date: ' + columns[4]);
                    isValid = false;
                }

                caseRecord.Stage__c = 'Advertising';

                if (isValid) {
                    cases.add(caseRecord);
                }
            } else {
                errorMessages.add('Row ' + i + ': CSV line does not have the expected number of columns: ' + line);
            }
        }
        return cases;
    }

    // Parse a CSV line
    private List<String> parseCSVLine(String line) {
        List<String> result = new List<String>();
        String current = '';
        Boolean inQuotes = false;
        for (Integer i = 0; i < line.length(); i++) {
            String c = line.substring(i, i + 1);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(current);
                current = '';
            } else {
                current += c;
            }
        }
        result.add(current);
        return result;
    }

    // Send an email if there are errors
    private void sendErrorEmail(String toAddress, List<String> errorMessages) {
        String subject = 'CSV Processing Error';
        String body = 'The following errors were found in the CSV file:\n\n' + String.join(errorMessages, '\n');

        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new String[] { toAddress });
        email.setSubject(subject);
        email.setPlainTextBody(body);

        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
    }

    // Send a success email
    private void sendSuccessEmail(String toAddress) {
        String subject = 'CSV Processing Successful';
        String body = 'The CSV file has been successfully retrieved and sent to Bona Vacantia.';

        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new String[] { toAddress });
        email.setSubject(subject);
        email.setPlainTextBody(body);

        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
    }
}
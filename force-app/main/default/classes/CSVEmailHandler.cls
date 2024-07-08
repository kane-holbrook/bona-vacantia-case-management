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
            List<String> notInJurisdiction = new List<String>();
            List<String> consultFCo = new List<String>();
            List<String> acceptedCompanies = new List<String>();

            if (errorMessages.isEmpty() && !casesToCreate.isEmpty()) {
                List<BV_Case__c> casesToInsert = new List<BV_Case__c>();

                for (BV_Case__c caseRecord : casesToCreate) {
                    String postalCode = fetchPostCode(caseRecord.Company_No__c);
                    Integer jurisdictionStatus = handleJurisdictionCheck(postalCode);

                    if (jurisdictionStatus == 1) {
                        casesToInsert.add(caseRecord);
                        acceptedCompanies.add(caseRecord.Company_No__c + ' - ' + caseRecord.Name);
                    } else if (jurisdictionStatus == 2) {
                        consultFCo.add(caseRecord.Company_No__c + ' - ' + caseRecord.Name);
                    } else if (jurisdictionStatus == 3) {
                        notInJurisdiction.add(caseRecord.Company_No__c + ' - ' + caseRecord.Name);
                    }
                }

                if (!casesToInsert.isEmpty()) {
                    insert casesToInsert; // Insert the cases if they are within jurisdiction
                }

                sendJurisdictionEmail(email.fromAddress, notInJurisdiction, consultFCo, acceptedCompanies, !casesToInsert.isEmpty());
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

    // Parse CSV function
    private List<BV_Case__c> parseCSV(String csvContent, List<String> errorMessages) {
        List<BV_Case__c> cases = new List<BV_Case__c>();
        List<String> csvLines = csvContent.split('\n');

        for (Integer i = 1; i < csvLines.size(); i++) {
            String line = csvLines[i];
            List<String> columns = parseCSVLine(line);

            if (columns.size() >= 5) {
                BV_Case__c caseRecord = new BV_Case__c();
                Boolean isValid = true;

                caseRecord.Company_No__c = columns[0];

                try {
                    caseRecord.Date_Dissolved__c = Date.valueOf(columns[1]);
                    System.debug('Date_Dissolved__c: ' + caseRecord.Date_Dissolved__c);
                } catch (Exception e) {
                    errorMessages.add('Row ' + i + ': Error converting Date_Dissolved__c to Date: ' + columns[1]);
                    isValid = false;
                }

                caseRecord.Rm_Reference__c = columns[2];
                System.debug('Rm_Reference__c: ' + caseRecord.Rm_Reference__c);
                caseRecord.Case_Name__c = columns[3];
                caseRecord.Name = columns[3];
                System.debug('Case_Name__c: ' + caseRecord.Case_Name__c);

                try {
                    caseRecord.Date_Received__c = Date.valueOf(columns[4]);
                    System.debug('Date_Received__c: ' + caseRecord.Date_Received__c);
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

    // Fetch the postcode
    private String fetchPostCode(String companyNumber) {
        String postalCode = '';
        String endpoint = '/company/' + companyNumber;
        System.debug('Endpoint: ' + endpoint);
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:Companies_House_Named' + endpoint);
        req.setMethod('GET');

        Http http = new Http();
        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            if (responseMap.containsKey('registered_office_address')) {
                Map<String, Object> address = (Map<String, Object>) responseMap.get('registered_office_address');
                if (address.containsKey('postal_code')) {
                    postalCode = (String) address.get('postal_code');
                }
            }
        }
        System.debug('Postal Code: ' + postalCode);
        return postalCode;
    }

    // Handle the Jurisdiction check
    private Integer handleJurisdictionCheck(String postalCode) {
        String splitPostalCode = postalCode.split(' ')[0];

        List<Jurisdiction_Postcode__mdt> postcodeDetails = [
            SELECT Id, Label, Consult_F_Co__c, Not_DOL__c 
            FROM Jurisdiction_Postcode__mdt 
            WHERE Label = :splitPostalCode 
            LIMIT 1
        ];

        // Check if postcode is within the list of Lancaster or Cornwall postcodes, and if Not DOL or Consult F&Co. Else it is within jurisdiction
        if (!postcodeDetails.isEmpty()) {
            Jurisdiction_Postcode__mdt jurisdiction = postcodeDetails[0];
            if (jurisdiction.Not_DOL__c) {
                return 1; // Within jurisdiction
            } else if (jurisdiction.Consult_F_Co__c) {
                return 2; // Consult F&Co
            } else {
                return 3; // Not within jurisdiction
            }
        } else {
            return 1; // Within jurisdiction
        }
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

    // Send a jurisdiction email
    private void sendJurisdictionEmail(String toAddress, List<String> notInJurisdiction, List<String> consultFCo, List<String> acceptedCompanies, Boolean casesInserted) {
        String subject = 'CSV Jurisdiction Results';
        String body = 'The CSV file has been processed. Please see the results below:\n\n';

        if (!acceptedCompanies.isEmpty()) {
            body += 'The following companies have been accepted and processed into cases:\n' + String.join(acceptedCompanies, '\n') + '\n\n';
        }

        if (!notInJurisdiction.isEmpty()) {
            body += 'The following companies are not within jurisdiction:\n' + String.join(notInJurisdiction, '\n') + '\n\n';
        }

        if (!consultFCo.isEmpty()) {
            body += 'The following companies may or may not be within the jurisdiction of the Duchy of Lancaster. Please consult F&Co:\n' + String.join(consultFCo, '\n') + '\n\n';
        }

        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new String[] { toAddress });
        email.setSubject(subject);
        email.setPlainTextBody(body);

        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
    }
}
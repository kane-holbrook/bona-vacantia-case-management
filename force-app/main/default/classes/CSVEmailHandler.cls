global class CSVEmailHandler implements Messaging.InboundEmailHandler {
    String bankName = '';
    String spreadsheetNumber = '';
    Decimal cashBalance = 0;

    Pattern caseNamePattern = Pattern.compile('^(FOIR|ESTA|COMP|GENE|CONV)\\d{2}#\\d+/\\d+$');

    global Messaging.InboundEmailResult handleInboundEmail(Messaging.InboundEmail email, Messaging.InboundEnvelope envelope) {
        Messaging.InboundEmailResult result = new Messaging.InboundEmailResult();

        // String allowedDomain = 'governmentlegal.gov.uk';
        // String senderDomain = email.fromAddress.substring(email.fromAddress.indexOf('@') + 1);
        

        // if (senderDomain != allowedDomain) {
        //     System.debug('Email from unauthorized domain: ' + senderDomain);
        //     result.success = false;
        //     return result;
        // }

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
            List<String> duplicateInCSV = new List<String>();  // Declare duplicateInCSV here
            List<Map<String, Object>> casesToCreate = parseCSV(csvContent, errorMessages);
            List<String> notInJurisdiction = new List<String>();
            List<String> consultFCo = new List<String>();
            List<String> acceptedCompanies = new List<String>();
            List<String> existingCasesList = new List<String>();
            Set<String> companyNumbersInCSV = new Set<String>();

            Id userId = getUserIdByEmail(email.fromAddress);
            if (userId == null) {
                String defaultEmail = getDefaultEmailFromMetadata();
                if (defaultEmail != null) {
                    userId = getUserIdByEmail(defaultEmail);
                } else {
                    System.debug('No default email found in metadata');
                }
            }


            if (errorMessages.isEmpty() && !casesToCreate.isEmpty()) {
                // Check for duplicates in the system
                List<BV_Case__c> caseRecords = new List<BV_Case__c>();
                for (Map<String, Object> caseMap : casesToCreate) {
                    BV_Case__c caseRecord = (BV_Case__c) caseMap.get('case');
                    caseRecord.OwnerId = userId; // Assign the case to the identified or default user
                    caseRecords.add(caseRecord);
                }

                Set<String> existingCompanyNumbers = getExistingCompanyNumbers(caseRecords);
                List<BV_Case__c> casesToInsert = new List<BV_Case__c>();

                // Fetch recent case names in the order of creation
                List<BV_Case__c> CaseNameList = [SELECT Name FROM BV_Case__c 
                                                ORDER BY CreatedDate DESC 
                                                LIMIT 100];

                // Determine the year suffix (e.g., "24" for 2024)
                String currentYear = String.valueOf(Date.today().year()).right(2);

                // Initialize the starting case ID
                Integer nextCaseID = 1;

                // If there are existing cases, get the last case ID
                if (!CaseNameList.isEmpty() && CaseNameList[0].Name != null || caseNamePattern.matcher(CaseNameList[0].Name).matches()) {
                    String lastCaseName = CaseNameList[0].Name;
                    List<String> NameParts = lastCaseName.split('#');
                    
                    if (NameParts.size() == 2) {
                        nextCaseID = Integer.valueOf(NameParts[1]) + 1; // Start from the next ID
                    }
                }

                for (Map<String, Object> caseMap : casesToCreate) {
                    BV_Case__c caseRecord = (BV_Case__c) caseMap.get('case');
                    Integer lineNumber = (Integer) caseMap.get('lineNumber');
                    lineNumber++;
                    String paddedCompanyNumber = padCompanyNumber(caseRecord.Company_No__c);
                    caseRecord.Company_No__c = paddedCompanyNumber;
                    
                    // Check for duplicate within CSV only if jurisdiction check passes
                    if (companyNumbersInCSV.contains(caseRecord.Company_No__c)) {
                        Integer jurisdictionStatus = handleJurisdictionCheck(fetchPostCode(caseRecord.Company_No__c));
                        
                        if (jurisdictionStatus == 1) {
                            duplicateInCSV.add('Line ' + lineNumber + ': ' + caseRecord.Company_No__c + ' - ' + caseRecord.Reg_Name__c + ' - ' + caseRecord.Rm_Reference__c);
                        } else if(jurisdictionStatus == 2) {
                            consultFCo.add('Line ' + lineNumber + ': ' + caseRecord.Company_No__c + ' - ' + caseRecord.Reg_Name__c + ' - ' + caseRecord.Rm_Reference__c);
                        } else if(jurisdictionStatus == 3) {
                            notInJurisdiction.add('Line ' + lineNumber + ': ' + caseRecord.Company_No__c + ' - ' + caseRecord.Reg_Name__c + ' - ' + caseRecord.Rm_Reference__c);
                        }
                        continue;
                    }
                
                    companyNumbersInCSV.add(caseRecord.Company_No__c);
                
                    if (existingCompanyNumbers.contains(paddedCompanyNumber)) {
                        existingCasesList.add('Line ' + lineNumber + ': ' + caseRecord.Company_No__c + ' - ' + caseRecord.Reg_Name__c + ' - ' + caseRecord.Rm_Reference__c);
                        continue;
                    }
                
                    String postalCode = fetchPostCode(caseRecord.Company_No__c);
                    Integer jurisdictionStatus = handleJurisdictionCheck(postalCode);
                
                    if (jurisdictionStatus == 1) {
                        // Generate a unique case name for each accepted case
                        String newCaseName = 'COMP' + currentYear + '#' + nextCaseID + '/1';
                        nextCaseID++; // Increment for the next case

                        caseRecord.Name = newCaseName; // Assign the new case name
                        casesToInsert.add(caseRecord);
                        acceptedCompanies.add('Line ' + lineNumber + ': ' + caseRecord.Company_No__c + ' - ' + caseRecord.Reg_Name__c + ' - ' + caseRecord.Rm_Reference__c);
                    } else if (jurisdictionStatus == 2) {
                        consultFCo.add('Line ' + lineNumber + ': ' + caseRecord.Company_No__c + ' - ' + caseRecord.Reg_Name__c + ' - ' + caseRecord.Rm_Reference__c);
                    } else if (jurisdictionStatus == 3) {
                        notInJurisdiction.add('Line ' + lineNumber + ': ' + caseRecord.Company_No__c + ' - ' + caseRecord.Reg_Name__c + ' - ' + caseRecord.Rm_Reference__c);
                    }
                }
                

                if(!errorMessages.isEmpty()) {
                    sendErrorEmail(email.fromAddress, errorMessages);
                    result.success = false;
                    return result;
                } else if (!casesToInsert.isEmpty()) {
                    insert casesToInsert; // Insert the cases if they are within jurisdiction

                    // After insertion, create Case_History__c records for each case
                    for (BV_Case__c insertedCase : casesToInsert) {
                        createCaseHistoryForCase(insertedCase); // Create a Case History record for each case
                        createBankBuildingSociety(insertedCase, bankName, spreadsheetNumber);
                        createHiddenScreenForCase(insertedCase);
                    }
                    System.enqueueJob(new EmailSOSCaseQueueable(casesToInsert, 0));
                }

                sendJurisdictionEmail(email.fromAddress, notInJurisdiction, consultFCo, acceptedCompanies, existingCasesList, duplicateInCSV, !casesToInsert.isEmpty());
            } else {
                System.debug('Error messages: ' + errorMessages);
                System.debug(errorMessages.size());
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
    private List<Map<String, Object>> parseCSV(String csvContent, List<String> errorMessages) {
        List<Map<String, Object>> cases = new List<Map<String, Object>>();
        List<String> csvLines = csvContent.split('\n');

        String bankAndSpreadsheetLine = csvLines[0];
        List<String> bankAndSpreadsheetColumns = parseCSVLine(bankAndSpreadsheetLine);

        if (bankAndSpreadsheetColumns.size() != 2) {
            errorMessages.add('First line of the CSV must contain exactly two values: Bank Name and Spreadsheet Number.');
            return cases;
        }

        bankName = bankAndSpreadsheetColumns[0];
        spreadsheetNumber = bankAndSpreadsheetColumns[1].trim();

        // Remove the first two values (Bank Name/Spreadsheet Number line)
        csvLines.remove(0); 
        
        if (csvLines.size() <= 1) {
            errorMessages.add('CSV does not contain any data rows after the header.');
            return cases;
        }
    
        // Check the headers
        if (!validateCSVHeaders(csvLines[0], errorMessages)) {
            return cases;
        }

        RecordType compRecordType = [
        SELECT Id 
        FROM RecordType 
        WHERE DeveloperName = 'COMP' 
        AND SObjectType = 'BV_Case__c' 
        LIMIT 1
        ];
    
        for (Integer i = 1; i < csvLines.size(); i++) {
            String line = csvLines[i];
            List<String> columns = parseCSVLine(line);
    
            if (columns.size() == 6) {
                BV_Case__c caseRecord = new BV_Case__c();
                Boolean isValid = true;
    
                for (Integer j = 0; j < columns.size(); j++) {
                    if (columns[j].trim() == '' || columns[j].trim() == null) {
                        errorMessages.add('Row ' + i + ': Missing value in column ' + (j + 1));
                        isValid = false;
                    }
                }

                caseRecord.RecordTypeId = compRecordType.Id;
                caseRecord.Case_Type__c = 'H3 - Electronic Bulk Referral';
    
                caseRecord.Company_No__c = padCompanyNumber(columns[0]);
                caseRecord.Name = columns[3].toUpperCase(); 
                caseRecord.Reg_Name__c = columns[3].toUpperCase();
    
                if (!isCompanyNumberValid(caseRecord.Company_No__c)) {
                    errorMessages.add('Row ' + i + ': Company number not found in the Companies House: ' + caseRecord.Company_No__c);
                    isValid = false;
                }
    
                try {
                    caseRecord.Date_Dissolved__c = Date.valueOf(columns[1]);
                } catch (Exception e) {
                    errorMessages.add('Row ' + i + ': Error converting Date_Dissolved__c to Date: ' + columns[1]);
                    isValid = false;
                }
    
                caseRecord.Rm_Reference__c = columns[2];
                caseRecord.Case_Name__c = caseRecord.Name;

                fetchCompanyDetails(caseRecord, caseRecord.Company_No__c);
    
                String apiCompanyName = fetchCompanyName(caseRecord.Company_No__c);
                if (!caseRecord.Name.equals(apiCompanyName)) {
                    errorMessages.add('Row ' + i + ': Company name mismatch. Company Name in the CSV: ' + caseRecord.Name + ' - Company Name in Company House: ' + apiCompanyName);
                    isValid = false;
                }
    
                try {
                    caseRecord.Date_Received__c = Date.valueOf(columns[4]);
                } catch (Exception e) {
                    errorMessages.add('Row ' + i + ': Error converting Date_Received__c to Date: ' + columns[4]);
                    isValid = false;
                }
    
                try {
                    String amountCollected = columns[5].trim().replace(',', '');
                    cashBalance = Decimal.valueOf(amountCollected);
                } catch (Exception e) {
                    errorMessages.add('Row ' + i + ': Error converting Amount_Collected__c to Decimal: ' + columns[5]);
                    isValid = false;
                }
    
                caseRecord.Stage__c = 'Advertising';
    
                if (isValid) {
                    Map<String, Object> caseMap = new Map<String, Object>{
                        'lineNumber' => i,
                        'case' => caseRecord
                    };
                    cases.add(caseMap);
                }
            } else {
                errorMessages.add('Row ' + i + ': CSV line does not have the expected number of columns: ' + line);
            }
        }
    
        return cases;
    }

    // Validate CSV headers
    private Boolean validateCSVHeaders(String headerLine, List<String> errorMessages) {
        List<String> expectedHeaders = new List<String>{
            'Company Number',
            'Date of Dissolution',
            'Reference Number',
            'Company name',
            'Date Monies Transferred',
            'Amount to be transferred'
        };
        List<String> actualHeaders = parseCSVLine(headerLine);
    
        Boolean headersValid = true;
    
        if (actualHeaders.size() != expectedHeaders.size()) {
            errorMessages.add('CSV headers do not match the expected number of columns.');
            errorMessages.add('Here are the expected headers: ' + String.join(expectedHeaders, ', '));
            headersValid = false;
        } else {
            List<String> mismatchedHeaders = new List<String>();
            for (Integer i = 0; i < expectedHeaders.size(); i++) {
                if (actualHeaders[i].trim() != expectedHeaders[i]) {
                    mismatchedHeaders.add('Expected: ' + expectedHeaders[i] + ', Found: ' + actualHeaders[i]);
                    headersValid = false;
                }
            }
            if (!mismatchedHeaders.isEmpty()) {
                errorMessages.add('CSV header mismatches found:');
                errorMessages.addAll(mismatchedHeaders);
            }
        }
    
        return headersValid;
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

    // Check if the company number is valid
    private Boolean isCompanyNumberValid(String companyNumber) {
        String endpoint = '/company/' + companyNumber;
        System.debug('Endpoint: ' + endpoint);

        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:Companies_House_Named' + endpoint);
        req.setMethod('GET');

        Http http = new Http();
        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            return responseMap.containsKey('company_number');
        }

        return false;
    }

    private void fetchCompanyDetails(BV_Case__c caseRecord, String companyNumber) {
        String endpoint = '/company/' + companyNumber;
        System.debug('Endpoint: ' + endpoint);
    
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:Companies_House_Named' + endpoint);
        req.setMethod('GET');
    
        Http http = new Http();
        HttpResponse res = http.send(req);
    
        if (res.getStatusCode() == 200) {
            Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
    
            // Fetch and map the registered office address
            if (responseMap.containsKey('registered_office_address')) {
                Map<String, Object> address = (Map<String, Object>) responseMap.get('registered_office_address');
                
                if (address.containsKey('address_line_1')) {
                    caseRecord.Reg_Office_Addr_1__c = (String) address.get('address_line_1');
                }
                if (address.containsKey('address_line_2')) {
                    caseRecord.Reg_Office_Addr_2__c = (String) address.get('address_line_2');
                }
                if (address.containsKey('locality')) {
                    caseRecord.Reg_Office_Addr_3__c = (String) address.get('locality');
                }
                if (address.containsKey('region')) {
                    caseRecord.Reg_Office_Addr_4__c = (String) address.get('region');
                }
                if (address.containsKey('postal_code')) {
                    caseRecord.Reg_Office_PC__c = (String) address.get('postal_code');
                }
            }
    
            // Fetch and map the date of creation (date_of_creation)
            if (responseMap.containsKey('date_of_creation')) {
                try {
                    String dateOfCreation = (String) responseMap.get('date_of_creation');
                    caseRecord.Date_Incorporated__c = Date.valueOf(dateOfCreation);
                } catch (Exception e) {
                    System.debug('Error converting date_of_creation: ' + e.getMessage());
                }
            }

            if (responseMap.containsKey('company_status') && responseMap.containsKey('type')) {
                String companyStatus = (String) responseMap.get('company_status');
                String companyType = (String) responseMap.get('type');
                
                if (companyStatus.equals('dissolved') && companyType.equals('ltd')) {
                    caseRecord.Type__c = 'Dissolved Company';
                } else if (companyStatus.equals('dissolved') && companyType.equals('llp')) {
                    caseRecord.Type__c = 'Dissolved LLP';
                }else if (companyStatus.equals('active') && companyType.equals('ltd')) {
                    caseRecord.Type__c = 'Active Company';
                } else if (companyStatus.equals('active') && companyType.equals('llp')) {
                    caseRecord.Type__c = 'Active LLP';
                }else if (companyStatus.equals('dissolved') && !companyType.equals('ltd') || !companyType.equals('llp')) {
                    caseRecord.Type__c = 'Other Corporate Body';
                }else if (companyStatus.equals('active') && !companyType.equals('ltd') || !companyType.equals('llp')) {
                    caseRecord.Type__c = 'Active Other Corporate Body';
                }
            } else {
                caseRecord.Type__c = 'Other';
            }
        } else {
            System.debug('Failed to fetch company details. Status code: ' + res.getStatusCode());
        }
    }
    
    // Fetch the company name
    private String fetchCompanyName(String companyNumber) {
        String companyName = '';
        String endpoint = '/company/' + companyNumber;
        System.debug('Endpoint: ' + endpoint);
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:Companies_House_Named' + endpoint);
        req.setMethod('GET');

        Http http = new Http();
        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            if (responseMap.containsKey('company_name')) {
                companyName = ((String) responseMap.get('company_name')).toUpperCase();
            }
        }

        return companyName;
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
    private void sendJurisdictionEmail(String toAddress, List<String> notInJurisdiction, List<String> consultFCo, List<String> acceptedCompanies, List<String> existingCasesList, List<String> duplicateInCSV, Boolean casesInserted) {
        String subject = 'CSV Jurisdiction Results';
        String body = '<p>The CSV file has been processed from the bank of ' + bankName + ' with spreadsheet number of ' + spreadsheetNumber + ' - Please see the results below:</p>';
    
        if (!acceptedCompanies.isEmpty()) {
            body += '<p><em>The following companies have been accepted and processed into cases:</em><br>' + formatLinesForEmail(acceptedCompanies) + '</p>';
        }
    
        // Add 3 line breaks after the initial table
        body += '<br><br><br>';
    
        if (!notInJurisdiction.isEmpty()) {
            body += '<p><em>The following companies are not within jurisdiction, and have not been processed into cases:</em><br>' + formatLinesForEmail(notInJurisdiction) + '</p>';
        }
    
        if (!consultFCo.isEmpty()) {
            // Add 1 line break between jurisdiction-related sections
            body += '<br><p><em>The following companies may or may not be within the jurisdiction of the Duchy of Lancaster, and have not been processed into cases. Please consult F&Co for more information:</em><br>' + formatLinesForEmail(consultFCo) + '</p>';
        }
    
        // Add 3 line breaks after the jurisdiction-related sections
        body += '<br><br><br>';
    
        if (!existingCasesList.isEmpty()) {
            body += '<p><em>The following companies already exist as cases and were not processed:</em><br>' + formatLinesForEmail(existingCasesList) + '</p>';
        }
    
        if (!duplicateInCSV.isEmpty()) {
            body += '<p><em>The following companies are duplicates within the CSV. They have not been processed into cases. These should be reviewed for manual entry:</em><br>' + formatLinesForEmail(duplicateInCSV) + '</p>';
        }
    
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new String[] { toAddress });
        email.setSubject(subject);
        email.setHtmlBody(body); // Set the body as HTML
    
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
    }
    
    // Helper method to format each line with bolded company number and name in HTML
    private String formatLinesForEmail(List<String> lines) {
        List<String> formattedLines = new List<String>();

        for (String line : lines) {
            List<String> parts = line.split(' - ');
            if (parts.size() >= 3) {
                formattedLines.add(parts[0].substring(0, parts[0].indexOf(':') + 2) + '<strong>' + parts[0].substring(parts[0].indexOf(':') + 2) + '</strong>' + ' - <strong>' + parts[1] + '</strong>' + ' - ' + parts[2]);
            } else {
                formattedLines.add(line);
            }
        }

        return String.join(formattedLines, '<br>');
    }
    

    // Fetch existing company numbers from the system
    private Set<String> getExistingCompanyNumbers(List<BV_Case__c> casesToCreate) {
        Set<String> companyNumbers = new Set<String>();
        for (BV_Case__c caseRecord : casesToCreate) {
            companyNumbers.add(caseRecord.Company_No__c);
        }

        List<BV_Case__c> existingCases = [
            SELECT Company_No__c 
            FROM BV_Case__c 
            WHERE Company_No__c IN :companyNumbers
        ];

        Set<String> existingCompanyNumbers = new Set<String>();
        for (BV_Case__c existingCase : existingCases) {
            existingCompanyNumbers.add(existingCase.Company_No__c);
        }

        return existingCompanyNumbers;
    }

    // Pad the company number to ensure it is 8 digits long
    private String padCompanyNumber(String companyNumber) {
        while (companyNumber.length() < 8) {
            companyNumber = '0' + companyNumber;
        }
        return companyNumber;
    }

    private Id getUserIdByEmail(String email) {
        User user = [SELECT Id FROM User WHERE Email = :email LIMIT 1];
        System.Debug('User: ' + user);
        if (user != null) {
            System.Debug('User ID: ' + user.Id);
            return user.Id;
        }
        return null;
    }

    private String getDefaultEmailFromMetadata() {
        UserEmailConfig__mdt config = [SELECT Email__c FROM UserEmailConfig__mdt WHERE MasterLabel = 'DefaultEmailConfig' LIMIT 1];
        if (config != null && config.Email__c != null) {
            return config.Email__c;
        }
        return null;
    }

    private void createCaseHistoryForCase(BV_Case__c caseRecord) {
        Case_History__c caseHistory = new Case_History__c();
        caseHistory.Action__c = bankName + ' - ' + spreadsheetNumber; // Set Action to bank-name and spreadsheet number
        caseHistory.BV_Case__c = caseRecord.Id; // Lookup to the BV Case
        caseHistory.Date_Inserted_Time__c = DateTime.now(); // Set current date for Date Inserted
        caseHistory.Last_updated__c = DateTime.now(); // Set current date for Last Updated
        caseHistory.Details__c = caseRecord.Name + ' - ' + caseRecord.Company_No__c; // Set Details to the Company Name + Company Number
        
        insert caseHistory; // Insert the Case History record
    }

    private void createHiddenScreenForCase(BV_Case__c caseRecord){
        Case_Detail__c caseDetail = new Case_Detail__c();
        caseDetail.BV_Case__c = caseRecord.Id;
        caseDetail.Open_Closed__c = 'Open';

        RecordType caseDetailRecordType = [
            SELECT ID
            FROM RecordType
            WHERE DeveloperName = 'Admin_Hidden_Screen'
            AND SObjectType = 'Case_Detail__c'
            LIMIT 1
        ];

        caseDetail.RecordTypeId = caseDetailRecordType.Id;

        insert caseDetail;
    }

    private void createBankBuildingSociety(BV_Case__c caseRecord, String bankName, String spreadsheetNumber) {
        AssetLiability__c assetLiability = new AssetLiability__c();
        assetLiability.BV_Case__c = caseRecord.Id;
        assetLiability.Balance__c = cashBalance;
        assetLiability.Bank__c = bankName;
        assetLiability.Spreadsheet_Number__c = spreadsheetNumber;
        assetLiability.Electronic_Referral__c = true;

        RecordType assetRecordType = [
        SELECT Id 
        FROM RecordType 
        WHERE DeveloperName = 'Companies_Bank_Building_society' 
        AND SObjectType = 'AssetLiability__c' 
        LIMIT 1
        ];

        assetLiability.RecordTypeId = assetRecordType.Id;
        
        insert assetLiability;
    }
    
}
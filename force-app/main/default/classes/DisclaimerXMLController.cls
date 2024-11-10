public with sharing class DisclaimerXMLController {
    public List<DisclaimerWrapper> disclaimers { get; private set; }
    public String currentUser { get; private set; }
    public String formattedPubDate { get; private set; }
    public String formattedCurrentDate { get; private set; }
    public String formattedCurrentDateLong { get; private set; }
    public String currentTime { get; private set; }
    public String xmlHeader { get; private set; }
    public String metadata { get; private set; }
    
    public class DisclaimerWrapper {
        public Case_Detail__c disclaimer { get; set; }
        public AssetLiability__c assetLiability { get; set; }
        public String formattedNotificationDate { get; set; }
    }
    
    public DisclaimerXMLController() {
        xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
        metadata = '<ukm:Metadata>\n' + 
                   '    <ukm:PublishDate>2024-10-14</ukm:PublishDate>\n' + 
                   '    <ukm:SupplierNoticeID></ukm:SupplierNoticeID>\n' + 
                   '    <ukm:KeyedBy>DAS</ukm:KeyedBy>\n' + 
                   '    <ukm:SortKey />\n' + 
                   '    <ukm:Language>English</ukm:Language>\n' + 
                   '    <ukm:NoticeClass>Standard</ukm:NoticeClass>\n' + 
                   '    <ukm:TimeStamp>09:37</ukm:TimeStamp>\n' + 
                   '</ukm:Metadata>';

        // Initialize data
        currentUser = UserInfo.getName();
        Date currentDate = Date.today();
        Date publicationDate = getPublicationDate(currentDate);
        
        // Format dates using Datetime methods
        Datetime dtPubDate = Datetime.newInstance(publicationDate, Time.newInstance(0, 0, 0, 0));
        Datetime dtCurrentDate = Datetime.newInstance(currentDate, Time.newInstance(0, 0, 0, 0));
        
        formattedPubDate = dtPubDate.format('yyyy-MM-dd');
        formattedCurrentDate = dtCurrentDate.format('yyyy-MM-dd');
        formattedCurrentDateLong = dtCurrentDate.format('d MMMM yyyy');
        currentTime = Datetime.now().format('HH:mm');
        
        // Fetch case number from URL
        String caseNumber = ApexPages.currentPage().getParameters().get('caseNumber');
        
        // Query disclaimers and related records
        List<Case_Detail__c> disclaimerRecords;
        if (caseNumber != null) {
            disclaimerRecords = [
                SELECT Id, Publish__c, Completed__c, Lg__c, Published__c, 
                       Disclaimer_Notice_Type__c, Former_Name__c, Whole_Part__c,
                       Power__c, Bv_Ref__c, Company_Name__c, Company_Number__c,
                       Tenure__c, Title_No__c, Conveyance__c, Other_Details__c,
                       BV_Case__c, BV_Case__r.Date_Of_Notification__c
                FROM Case_Detail__c
                WHERE Publish__c = true 
                AND Completed__c = true 
                AND Lg__c = false
                AND BV_Case__r.Id = :caseNumber
            ];
        } else {
            disclaimerRecords = [
                SELECT Id, Publish__c, Completed__c, Lg__c, Published__c, 
                       Disclaimer_Notice_Type__c, Former_Name__c, Whole_Part__c,
                       Power__c, Bv_Ref__c, Company_Name__c, Company_Number__c,
                       Tenure__c, Title_No__c, Conveyance__c, Other_Details__c,
                       BV_Case__c, BV_Case__r.Date_Of_Notification__c
                FROM Case_Detail__c
                WHERE Publish__c = true 
                AND Completed__c = true 
                AND Lg__c = false
            ];
        }
        
        // Get related Asset/Liability records
        Set<Id> bvCaseIds = new Set<Id>();
        for(Case_Detail__c disc : disclaimerRecords) {
            bvCaseIds.add(disc.BV_Case__c);
        }
        
        // Query Asset/Liability records
        Map<Id, AssetLiability__c> assetMap = new Map<Id, AssetLiability__c>();
        for(AssetLiability__c asset : [
            SELECT Id, BV_Case__c, Address_Desc__c
            FROM AssetLiability__c
            WHERE BV_Case__c IN :bvCaseIds
        ]) {
            assetMap.put(asset.BV_Case__c, asset);
        }
        
        // Create wrapper objects
        disclaimers = new List<DisclaimerWrapper>();
        for(Case_Detail__c disc : disclaimerRecords) {
            DisclaimerWrapper wrapper = new DisclaimerWrapper();
            wrapper.disclaimer = disc;
            wrapper.assetLiability = assetMap.get(disc.BV_Case__c);
            wrapper.formattedNotificationDate = getFormattedNotificationDate(disc.BV_Case__r.Date_Of_Notification__c);
            disclaimers.add(wrapper);
        }

        // Update the records after generating XML
        updateDisclaimerRecords();
    }
    
    private Date getPublicationDate(Date currentDate) {
        Integer addDays = 0;
        Date tempDate = currentDate;
        
        while(addDays < 3) {
            tempDate = tempDate.addDays(1);
            String dayOfWeek = Datetime.newInstance(tempDate, Time.newInstance(0, 0, 0, 0))
                                     .format('E');
            if(dayOfWeek != 'Sat' && dayOfWeek != 'Sun') {
                addDays++;
            }
        }
        return tempDate;
    }
    
    private String getFormattedNotificationDate(Date notificationDate) {
        if (notificationDate == null) return '';
        return Datetime.newInstance(notificationDate, Time.newInstance(0, 0, 0, 0))
                      .format('d MMMM yyyy');
    }
    
    public void updateDisclaimerRecords() {
        List<Case_Detail__c> recordsToUpdate = new List<Case_Detail__c>();
        Date publicationDate = getPublicationDate(Date.today());
        
        for(DisclaimerWrapper wrapper : disclaimers) {
            Case_Detail__c disc = wrapper.disclaimer;
            // Set DNS18 (Lg__c) to true to prevent future publication
            disc.Lg__c = true;
            // Set DNS17 (Published__c) to publication date
            disc.Published__c = Datetime.newInstance(publicationDate, Time.newInstance(0, 0, 0, 0))
                                      .format('yyyy-MM-dd');
            recordsToUpdate.add(disc);
        }
        
        if(!recordsToUpdate.isEmpty()) {
            try {
                update recordsToUpdate;
            } catch(Exception e) {
                ApexPages.addMessage(new ApexPages.Message(
                    ApexPages.Severity.ERROR,
                    'Error updating disclaimer records: ' + e.getMessage()
                ));
            }
        }
    }
}
import { LightningElement, wire, track, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getHistoryItems from '@salesforce/apex/HistoryController.getHistoryItems';
import getUserNames from '@salesforce/apex/HistoryController.getUserNames';
import getCurrentUserId from '@salesforce/apex/HistoryController.getCurrentUserId';
import getSHDocuments from '@salesforce/apex/HistoryController.getSHDocuments';
import getSharePointSettings from '@salesforce/apex/FileControllerGraph.getSharePointSettings';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecordId } from 'c/sharedService';
import { NavigationMixin } from 'lightning/navigation';

export default class HistoryList extends NavigationMixin(LightningElement) {
    @api recordId;
    @track historyItems = [];
    @track filteredHistoryItems = [];
    @track isModalOpen = false;
    @track isDeleteModalOpen = false;
    @track currentRecordId;
    @track showRelatedItems = false;
    @track lastUpdated = 0;
    @track currentRecord = {};
    @track searchKey = '';
    @track dateFrom = null;
    @track dateTo = null;
    @track sortOrder = 'asc';
    @track sortOrderIcon = 'utility:arrowup';
    @track sortedBy = 'Date_Inserted__c';
    @track selectedHistoryType = 'allHistory';  // Default selection
    @track currentUserId;  // To store the current user's ID
    @track selectedRecordDetails = 'There are no history notes for this case.';  // New track property to store Details__c value
    @track sharePointSiteUrl;
    @track sharePointDirectoryPath;
    @track sortedByPriority = false;
    wiredHistoryItemsResult;
    userNames = {};

    historyTypeOptions = [
        { label: 'All history', value: 'allHistory' },
        { label: 'My history', value: 'myHistory' }
    ];

    connectedCallback() {
        this.recordId = getRecordId();
        this.fetchCurrentUserId();
        this.refreshHistoryItems();
        this.fetchSharePointSettings();
    }

    fetchCurrentUserId() {
        getCurrentUserId()
            .then(result => {
                this.currentUserId = result;
                this.filterHistoryItems();
            })
            .catch(error => {
                this.showToast('Error', 'Error fetching current user ID', 'error');
            });
    }

    fetchSharePointSettings() {
        getSharePointSettings()
            .then(settings => {
                this.sharePointSiteUrl = settings.SharePoint_Site_URL;
                this.sharePointDirectoryPath = settings.SharePoint_Directory_Path;
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error fetching SharePoint settings:', error);
            });
    }

    @wire(getHistoryItems, { recordId: '$recordId' })
    wiredHistoryItems(result) {
        this.wiredHistoryItemsResult = result;
        if (result.data) {
            this.historyItems = result.data.map(item => {
                // Ensure history is an object and handle missing fields

                console.log('item', item);
                const history = item.history || {};
                const emailMessage = item.EmailMessage || {};
                const shDocuments = history.SHDocuments__r || [];

                const nonEmptyDocuments = shDocuments.filter(doc => doc.FileSize__c > 0 || doc.DocumentType__c);
    
                // Calculate total file size of related items
                let totalFileSize = 0;
                if (shDocuments.length > 0) {
                    totalFileSize = shDocuments.reduce((sum, doc) => sum + (doc.FileSize__c || 0), 0);
                }
    
                const mappedItem = {
                    Id: history.Id || '',
                    BV_Case__c: history.BV_Case__c || '',
                    Date_Inserted__c: history.Date_Inserted__c || '',
                    Details__c: history.Details__c || '',
                    Action__c: history.Action__c || '',
                    Case_Officer__c: history.Case_Officer__c || '',
                    Flag_as_important__c: history.Flag_as_important__c || false,
                    Last_updated__c: history.Last_updated__c || '',
                    isExpanded: false,
                    hasRelatedItems: nonEmptyDocuments.length > 0 || (emailMessage.Subject && emailMessage.Subject.trim() !== ''),
                    iconName: this.getIconName(false),
                    rowClass: history.Flag_as_important__c ? 'highlighted-row' : '',
                    flagIconClass: history.Flag_as_important__c ? 'icon-important' : 'icon-default',
                    notes: history.Details__c ? 'Has details' : '',
                    hasDetails: !!history.Details__c,
                    documentType: shDocuments.length > 0 ? shDocuments[0].DocumentType__c : '',
                    fileSize: this.formatFileSize(totalFileSize),  // Use the calculated total file size here
                    draft: shDocuments.length > 0 ? shDocuments[0].Draft__c : '',
                    SHDocuments__r: nonEmptyDocuments.map(doc => ({
                        ...doc,
                        showAttachmentIcon: doc.DocumentType__c === 'Email Attachment',
                        fileSize: doc.FileSize__c ? this.formatFileSize(doc.FileSize__c) : '',
                    })),
                    emailMessage,  // Include EmailMessage details
                    hasValidEmailMessage: !!emailMessage.Id,
                    Case_Officer_Name: this.userNames[history.Case_Officer__c] || history.Case_Officer__c // Fetch Case Officer Name here
                };

                return mappedItem;
            });
    
            const userIds = this.historyItems.map(item => item.Case_Officer__c);
            this.fetchUserNames(userIds);
            this.updateLastUpdated();
            this.filterHistoryItems();
        } else if (result.error) {
            this.showToast('Error', 'Error fetching history items', 'error');
        }
    }
        

    fetchUserNames(userIds) {
        // Filter out invalid or undefined IDs
        const validUserIds = userIds.filter(id => id && id.length === 18);
    
        // Check if there are any valid IDs before making the Apex call
        if (validUserIds.length > 0) {
            getUserNames({ userIds: validUserIds })
                .then(result => {
                    this.userNames = result;
                    this.historyItems = this.historyItems.map(item => ({
                        ...item,
                        Case_Officer_Name: this.userNames[item.Case_Officer__c] || item.Case_Officer__c
                    }));
                    this.sortHistoryItems();
                })
                .catch(error => {
                    console.log('Error fetching usernames', error);
                    this.showToast('Error', 'Error fetching user names', 'error');
                });
        } else {
            // Handle the case where there are no valid user IDs to fetch
            console.log('No valid user IDs to fetch');
            this.sortHistoryItems(); // Proceed to sort with existing data
        }
    }

    refreshHistoryItems() {
        refreshApex(this.wiredHistoryItemsResult);
    }

    updateLastUpdated() {
        if (this.historyItems.length > 0) {
            const latestItem = this.historyItems.reduce((latest, item) => {
                const itemDate = new Date(item.Last_updated__c);
                return itemDate > new Date(latest.Last_updated__c) ? item : latest;
            }, this.historyItems[0]);
            const now = new Date();
            const lastUpdateTime = new Date(latestItem.Last_updated__c);
            const diffInMinutes = Math.floor((now - lastUpdateTime) / 60000);
    
            if (diffInMinutes < 60) {
                this.lastUpdated = `${diffInMinutes} minutes ago`;
            } else if (diffInMinutes < 1440) {
                const diffInHours = Math.floor(diffInMinutes / 60);
                this.lastUpdated = `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
            } else {
                const diffInDays = Math.floor(diffInMinutes / 1440);
                this.lastUpdated = `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
            }
        }
    }
    

    getIconName(isExpanded) {
        return isExpanded ? "utility:chevrondown" : "utility:chevronright";
    }

    toggleRow(event) {
        const itemId = event.currentTarget.dataset.id;
        this.historyItems = this.historyItems.map(item => {
            if (item.Id === itemId) {
                item.isExpanded = !item.isExpanded;
                item.iconName = this.getIconName(item.isExpanded);
            }
            return item;
        });
        this.filterHistoryItems();
    }

    handleAdd() {
        this.currentRecordId = null;
        this.currentRecord = {};
        this.isModalOpen = true;
    }

    handleViewEdit(event) {
        this.currentRecordId = event.currentTarget.dataset.id;
        const record = this.historyItems.find(item => item.Id === this.currentRecordId);
        this.currentRecord = { ...record };

        getSHDocuments({ parentId: this.currentRecordId })
            .then(result => {
                if (result.length > 0) {
                    const shDocument = result[0];
                    this.currentRecord.fileName = shDocument.Name;
                    this.currentRecord.fileSize = shDocument.FileSize__c ? shDocument.FileSize__c : 0;
                    this.currentRecord.fileData = shDocument.FileContent__c;
                    this.currentRecord.documentType = shDocument.DocumentType__c;
                    this.currentRecord.draft = shDocument.Draft__c;
                    this.currentRecord.serverRelativeURL = shDocument.ServerRelativeURL__c;
                    this.currentRecord.documentId = shDocument.Id;
                }
                this.isModalOpen = true;
            })
            .catch(error => {
                this.showToast('Error', 'Error fetching documents', 'error');
            });
    }

    handleOpenInSharePoint(event) {
        const serverRelativeURL = event.currentTarget.dataset.url;

        let url = `${this.sharePointSiteUrl}/${serverRelativeURL}`;

        console.log('serverRelativeURL', url);
        if (url) {
            window.open(url, '_blank');
        } else {
            this.showToast('Error', 'No URL found for this item.', 'error');
        }
    }

    handleDeleteOpen(event) {
        this.currentRecordId = event.currentTarget.dataset.id;
        const record = this.historyItems.find(item => item.Id === this.currentRecordId);
        this.currentRecord = { ...record };
        this.isDeleteModalOpen = true;
    }

    handleDelete() {
        const deleteModal = this.template.querySelector('c-history-delete-modal');
        deleteModal.deleteRecord();
    }

    closeModal() {
        this.isModalOpen = false;
    }

    closeDeleteModal() {
        this.isDeleteModalOpen = false;
    }

    handleDeleteSuccess() {
        this.isDeleteModalOpen = false;
        this.showToast('Success', 'Record deleted successfully', 'success');
        this.refreshHistoryItems();
    }

    handleSave() {
        this.template.querySelector('c-history-edit-modal').saveRecord(this.recordId);
    }

    handleSaveSuccess() {
        this.isModalOpen = false;
        this.showToast('Success', 'Record saved successfully', 'success');
        this.refreshHistoryItems();
    }

    toggleShowRelatedItems(event) {
        this.showRelatedItems = event.target.checked;
        if (!this.showRelatedItems) {
            console.log('Show related items false');
            this.historyItems = this.historyItems.map(item => ({ 
                ...item, 
                isExpanded: false,
                iconName: this.getIconName(false)
            }));
        }
        this.filterHistoryItems();
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }

    handleSearchInputChange(event) {
        this.searchKey = event.target.value.toLowerCase();
        this.filterHistoryItems();
    }

    handleDateFilterChange(event) {
        const filterType = event.target.dataset.filter;
        if (filterType === 'from') {
            this.dateFrom = event.target.value ? new Date(event.target.value) : null;
        } else if (filterType === 'to') {
            this.dateTo = event.target.value ? new Date(event.target.value) : null;
        }
        this.filterHistoryItems();
    }

    handleSort(event) {
        const column = event.currentTarget.dataset.column;
        this.sortOrder = (this.sortedBy === column && this.sortOrder === 'asc') ? 'desc' : 'asc';
        this.sortOrderIcon = this.sortOrder === 'asc' ? 'utility:arrowup' : 'utility:arrowdown';
        this.sortedBy = column;
        this.sortHistoryItems();
    }

    sortHistoryItems() {
        this.historyItems.sort((a, b) => {
            let valA, valB;
    
            if (this.sortedBy === 'Important') {
                valA = a.Flag_as_important__c ? 0 : 1;
                valB = b.Flag_as_important__c ? 0 : 1;
            } else if (this.sortedBy === 'Notes__c') {
                valA = a.hasDetails ? 1 : 0;
                valB = b.hasDetails ? 1 : 0;
            } else {
                valA = a[this.sortedBy] ? a[this.sortedBy].toLowerCase() : '';
                valB = b[this.sortedBy] ? b[this.sortedBy].toLowerCase() : '';
            }
    
            if (valA < valB) {
                return this.sortOrder === 'asc' ? -1 : 1;
            } else if (valA > valB) {
                return this.sortOrder === 'asc' ? 1 : -1;
            }
            return 0;
        });
        this.filterHistoryItems();
    }
    

    filterHistoryItems() {
        this.filteredHistoryItems = this.historyItems.filter(item => {
            const searchKeyLower = this.searchKey.toLowerCase();
            const searchMatch = this.searchKey ? (
                (item.Action__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.notes?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.documentType?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.Case_Officer_Name?.toLowerCase() ?? '').includes(searchKeyLower)
            ) : true;

            const dateMatch = (
                (!this.dateFrom || new Date(item.Date_Inserted__c) >= this.dateFrom) &&
                (!this.dateTo || new Date(item.Date_Inserted__c) <= this.dateTo)
            );

            const historyTypeMatch = this.selectedHistoryType === 'allHistory' || (this.selectedHistoryType === 'myHistory' && item.Case_Officer__c === this.currentUserId);

            return searchMatch && dateMatch && historyTypeMatch;
        });
    }

    handleHistoryTypeChange(event) {
        this.selectedHistoryType = event.detail.value;
        this.filterHistoryItems();
    }

    handleRowClick(event) {
        const itemId = event.currentTarget.dataset.id;
        const record = this.historyItems.find(item => item.Id === itemId);
        this.selectedRecordDetails = record ? record.Details__c : 'There are no history notes for this case.';
    }

    get sortedByText() {
        const fieldLabelMap = {
            'Date_Inserted__c': 'Date Inserted',
            'Action__c': 'Action',
            'Notes__c': 'Notes',
            'DocumentType__c': 'Document Type',
            'FileSize__c': 'File Size',
            'Draft__c': 'Draft',
            'Case_Officer_Name': 'Case Officer',
            'Important': 'Important'
        };
    
        const sortedByLabel = fieldLabelMap[this.sortedBy] || this.sortedBy;
        const sortOrderText = this.sortOrder === 'asc' ? '(ascending)' : '(descending)';
        return `Sorted by ${sortedByLabel} ${sortOrderText} - Filtered by ${this.selectedHistoryType === 'allHistory' ? 'all history' : 'my history'}`;
    }

    get isSortedByDate() {
        return this.sortedBy === 'Date_Inserted__c';
    }

    get isSortedByAction() {
        return this.sortedBy === 'Action__c';
    }

    get isSortedByNotes() {
        return this.sortedBy === 'Notes__c';
    }

    get isSortedByDocumentType() {
        return this.sortedBy === 'DocumentType__c';
    }

    get isSortedByFileSize() {
        return this.sortedBy === 'FileSize__c';
    }

    get isSortedByDraft() {
        return this.sortedBy === 'Draft__c';
    }

    get isSortedByCaseOfficer() {
        return this.sortedBy === 'Case_Officer_Name';
    }

    get isSortedByImportant() {
        return this.sortedBy === 'Important';
    }      

    handleForward(event) {
        const itemId = event.currentTarget.dataset.id;
        const record = this.historyItems.find(item => item.Id === itemId);

        const emailQuickActionComponent = this.template.querySelector('c-email-quick-action');
        emailQuickActionComponent.invoke({
            HtmlBody: `Please find the details of the record below:<br><br>Date: ${record.Date_Inserted__c}<br>Action: ${record.Action__c}<br>Document Type: ${record.documentType}<br>File Size: ${record.fileSize}<br>Draft: ${record.draft}<br>Case Officer: ${record.Case_Officer_Name}<br><br>Notes:<br>${record.notes}`,
            Subject: `Forwarding Record: ${record.Action__c}`
        });
    }

    formatFileSize(size) {
        if (!size) {
            return '';
        }
        if (size < 1024) {
            return size + ' B';
        } else if (size < 1024 * 1024) {
            return (size / 1024).toFixed(2) + ' kB';
        } else if (size < 1024 * 1024 * 1024) {
            return (size / (1024 * 1024)).toFixed(2) + ' MB';
        } else {
            return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }
    }

    handleDeleteRelatedItem(event) {
        const relatedItemId = event.currentTarget.dataset.id;
        // Handle the deletion of the related item here
        // Add your deletion logic for related items
    }

    handleOpenEmailMessage(event) {
        const emailMessageId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: emailMessageId,
                objectApiName: 'EmailMessage',
                actionName: 'view'
            }
        });
    }
}
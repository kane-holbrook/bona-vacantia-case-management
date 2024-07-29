import { LightningElement, wire, track, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getHistoryItems from '@salesforce/apex/HistoryController.getHistoryItems';
import getUserNames from '@salesforce/apex/HistoryController.getUserNames';
import getCurrentUserId from '@salesforce/apex/HistoryController.getCurrentUserId';
import getSHDocuments from '@salesforce/apex/HistoryController.getSHDocuments';
import getSharePointSettings from '@salesforce/apex/FileController.getSharePointSettings';
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
    @track showRelatedItems = true;
    @track lastUpdated = 0;
    @track currentRecord = {};
    @track searchKey = '';
    @track dateFrom = null;
    @track dateTo = null;
    @track sortOrder = 'desc';
    @track sortOrderIcon = 'utility:arrowdown';
    @track sortedBy = 'Date_Inserted__c';
    @track selectedHistoryType = 'allHistory';  // Default selection
    @track currentUserId;  // To store the current user's ID
    @track selectedRecordDetails = 'There are no history notes for this case.';  // New track property to store Details__c value
    @track sharePointSiteUrl;
    @track sharePointDirectoryPath;
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
                // Calculate total file size of related items
                let totalFileSize = 0;
                if (item.SHDocuments__r && item.SHDocuments__r.length > 0) {
                    totalFileSize = item.SHDocuments__r.reduce((sum, doc) => sum + (doc.FileSize__c || 0), 0);
                }
    
                return {
                    ...item,
                    isExpanded: false,
                    hasRelatedItems: item.SHDocuments__r && item.SHDocuments__r.length > 0,
                    iconName: this.getIconName(false),
                    rowClass: item.Flag_as_important__c ? 'highlighted-row' : '',
                    flagIconClass: item.Flag_as_important__c ? 'icon-important' : 'icon-default',
                    notes: item.Details__c ? 'Has details' : '',
                    hasDetails: item.Details__c ? true : false,
                    documentType: item.SHDocuments__r && item.SHDocuments__r.length > 0 ? item.SHDocuments__r[0].DocumentType__c : '',
                    fileSize: this.formatFileSize(totalFileSize),  // Use the calculated total file size here
                    draft: item.SHDocuments__r && item.SHDocuments__r.length > 0 ? item.SHDocuments__r[0].Draft__c : '',
                    SHDocuments__r: item.SHDocuments__r ? item.SHDocuments__r.map(doc => ({
                        ...doc,
                        showAttachmentIcon: doc.DocumentType__c === 'Email Attachment',
                        fileSize: doc.FileSize__c ? this.formatFileSize(doc.FileSize__c) : '',
                    })) : []
                };
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
        getUserNames({ userIds })
            .then(result => {
                this.userNames = result;
                this.historyItems = this.historyItems.map(item => ({
                    ...item,
                    Case_Officer_Name: this.userNames[item.Case_Officer__c] || item.Case_Officer__c
                }));
                this.sortHistoryItems();
            })
            .catch(error => {
                this.showToast('Error', 'Error fetching user names', 'error');
            });
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
            this.lastUpdated = diffInMinutes;
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
            const valA = a[this.sortedBy] ? a[this.sortedBy].toLowerCase() : '';
            const valB = b[this.sortedBy] ? b[this.sortedBy].toLowerCase() : '';

            if (valA === '' || valA === null || valA === undefined) return 1;
            if (valB === '' || valB === null || valB === undefined) return -1;

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
        return `Sorted by ${this.sortedBy} ${this.sortOrder} - Filtered by ${this.selectedHistoryType === 'allHistory' ? 'all history' : 'my history'}`;
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
}
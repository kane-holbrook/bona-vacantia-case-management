import { LightningElement, wire, track, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getHistoryItems from '@salesforce/apex/HistoryController.getHistoryItems';
import getUserNames from '@salesforce/apex/HistoryController.getUserNames';
import getCurrentUserId from '@salesforce/apex/HistoryController.getCurrentUserId';
import getSHDocuments from '@salesforce/apex/HistoryController.getSHDocuments';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecordId } from 'c/sharedService';

export default class HistoryList extends LightningElement {
    @api recordId;
    @track historyItems = [];
    @track filteredHistoryItems = [];
    @track isModalOpen = false;
    @track isDeleteModalOpen = false;
    @track currentRecordId;
    @track showVersions = true;
    @track lastUpdated = 0;
    @track currentRecord = {};
    @track searchKey = '';
    @track dateFrom = null;
    @track dateTo = null;
    @track sortOrder = 'desc';
    @track sortOrderIcon = 'utility:arrowdown';
    @track selectedHistoryType = 'allHistory';  // Default selection
    @track currentUserId;  // To store the current user's ID
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

    @wire(getHistoryItems, { recordId: '$recordId' })
    wiredHistoryItems(result) {
        this.wiredHistoryItemsResult = result;
        if (result.data) {
            this.historyItems = result.data.map(item => ({
                ...item,
                isExpanded: false,
                hasVersions: item.Case_History__r && item.Case_History__r.length > 0,
                iconName: this.getIconName(false),
                rowClass: item.Flag_as_important__c ? 'highlighted-row' : '',
                flagIconClass: item.Flag_as_important__c ? 'icon-important' : 'icon-default',
                documentType: item.SHDocuments__r && item.SHDocuments__r.length > 0 ? item.SHDocuments__r[0].DocumentType__c : '',
                correspondenceWith: item.SHDocuments__r && item.SHDocuments__r.length > 0 ? item.SHDocuments__r[0].Correspondence_With__c : '',
                draft: item.SHDocuments__r && item.SHDocuments__r.length > 0 ? item.SHDocuments__r[0].Draft__c : ''
            }));
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
                this.filterHistoryItems();
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
                const itemDate = new Date(item.Date_Inserted__c);
                return itemDate > new Date(latest.Date_Inserted__c) ? item : latest;
            }, this.historyItems[0]);
            const now = new Date();
            const lastUpdateTime = new Date(latestItem.Date_Inserted__c);
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
                    this.currentRecord.correspondenceWith = shDocument.Correspondence_With__c;
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

    toggleShowVersions(event) {
        this.showVersions = event.target.checked;
        if (!this.showVersions) {
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

    handleSortByDate() {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        this.sortOrderIcon = this.sortOrder === 'asc' ? 'utility:arrowup' : 'utility:arrowdown';
        this.sortHistoryItems();
    }

    sortHistoryItems() {
        this.historyItems.sort((a, b) => {
            const dateA = a.Date_Inserted__c ? new Date(a.Date_Inserted__c) : null;
            const dateB = b.Date_Inserted__c ? new Date(b.Date_Inserted__c) : null;

            if (dateA === null) return 1;
            if (dateB === null) return -1;

            if (this.sortOrder === 'asc') {
                return dateA - dateB;
            } else {
                return dateB - dateA;
            }
        });
        this.filterHistoryItems();
    }

    filterHistoryItems() {
        this.filteredHistoryItems = this.historyItems.filter(item => {
            const searchKeyLower = this.searchKey.toLowerCase();
            const searchMatch = this.searchKey ? (
                (item.Action__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.documentType?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.correspondenceWith?.toLowerCase() ?? '').includes(searchKeyLower) ||
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

    get sortedByText() {
        return `Sorted by date ${this.sortOrder} - Filtered by ${this.selectedHistoryType === 'allHistory' ? 'all history' : 'my history'}`;
    }
}
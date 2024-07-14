import { LightningElement, wire, track, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getHistoryItems from '@salesforce/apex/HistoryController.getHistoryItems';
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
    wiredHistoryItemsResult;

    connectedCallback() {
        this.recordId = getRecordId();
        this.refreshHistoryItems();
    }

    @wire(getHistoryItems, { recordId: '$recordId' })
    wiredHistoryItems(result) {
        this.wiredHistoryItemsResult = result;
        if (result.data) {
            this.historyItems = result.data.map(item => ({
                ...item,
                isExpanded: false,
                hasVersions: item.Case_History__r && item.Case_History__r.length > 0,
                iconName: this.getIconName(false)
            }));
            this.updateLastUpdated();
            this.filterHistoryItems();
        } else if (result.error) {
            this.showToast('Error', 'Error fetching history items', 'error');
        }
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
            this.historyItems = this.historyItems.map(item => ({ ...item, isExpanded: false }));
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

    filterHistoryItems() {
        this.filteredHistoryItems = this.historyItems.filter(item => {
            const searchKeyLower = this.searchKey.toLowerCase();
            const searchMatch = this.searchKey ? (
                (item.Action__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.DocumentType__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.Correspondence_With__c?.toLowerCase() ?? '').includes(searchKeyLower)
            ) : true;

            const dateMatch = (
                (!this.dateFrom || new Date(item.Date_Inserted__c) >= this.dateFrom) &&
                (!this.dateTo || new Date(item.Date_Inserted__c) <= this.dateTo)
            );

            return searchMatch && dateMatch;
        });
    }
}
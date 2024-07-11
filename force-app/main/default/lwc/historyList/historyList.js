import { LightningElement, wire, track, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getHistoryItems from '@salesforce/apex/HistoryController.getHistoryItems';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecordId } from 'c/sharedService';

export default class HistoryList extends LightningElement {
    @api recordId;
    @track historyItems = [];
    @track isModalOpen = false;
    @track isDeleteModalOpen = false;
    @track currentRecordId;
    @track showVersions = true;
    @track lastUpdated = 0;
    @track currentRecord = {};
    wiredHistoryItemsResult;

    connectedCallback() {
        this.recordId = getRecordId();
        refreshApex(this.wiredHistoryItemsResult);
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
        } else if (result.error) {
            this.showToast('Error', 'Error fetching history items', result.error);
        }
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
        this.isModalOpen = true;
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
        return refreshApex(this.wiredHistoryItemsResult);
    }

    handleSave() {
        this.template.querySelector('c-history-edit-modal').saveRecord(this.recordId);
    }

    handleSaveSuccess() {
        this.isModalOpen = false;
        this.showToast('Success', 'Record saved successfully', 'success');
        return refreshApex(this.wiredHistoryItemsResult);
    }

    toggleShowVersions(event) {
        this.showVersions = event.target.checked;
        if (!this.showVersions) {
            this.historyItems = this.historyItems.map(item => ({ ...item, isExpanded: false }));
        }
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }
}
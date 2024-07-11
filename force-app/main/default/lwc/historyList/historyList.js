import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getHistoryItems from '@salesforce/apex/HistoryController.getHistoryItems';
import getHistoryVersions from '@salesforce/apex/HistoryController.getHistoryVersions';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class HistoryList extends LightningElement {
    @track historyItems = [];
    @track isModalOpen = false;
    @track currentRecordId;
    @track showVersions = true;
    @track lastUpdated = 0;
    @track currentRecord = {};
    wiredHistoryItemsResult;

    @wire(getHistoryItems)
    wiredHistoryItems(result) {
        this.wiredHistoryItemsResult = result;
        if (result.data) {
            this.historyItems = result.data.map(item => ({
                ...item,
                isExpanded: false,
                versions: [],
                hasVersions: false,
                iconName: this.getIconName(false)
            }));
            this.updateLastUpdated();
        } else if (result.error) {
            // Handle error
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
                if (item.isExpanded && item.versions.length === 0) {
                    this.loadVersions(item);
                }
            }
            return item;
        });
    }

    loadVersions(item) {
        getHistoryVersions({ historyItemId: item.Id })
            .then(versions => {
                item.versions = versions;
                item.hasVersions = versions.length > 0;
                this.historyItems = [...this.historyItems];
            })
            .catch(error => {
                // Handle error
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

    closeModal() {
        this.isModalOpen = false;
    }

    handleSave() {
        this.template.querySelector('c-history-edit-modal').saveRecord();
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
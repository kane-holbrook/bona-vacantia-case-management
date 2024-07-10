import { LightningElement, wire, track } from 'lwc';
import getHistoryItems from '@salesforce/apex/HistoryController.getHistoryItems';
import getHistoryVersions from '@salesforce/apex/HistoryController.getHistoryVersions';

export default class HistoryList extends LightningElement {
    @track historyItems = [];
    @track isModalOpen = false;
    @track currentRecordId;
    @track showVersions = true;
    @track lastUpdated = 0;

    @wire(getHistoryItems)
    wiredHistoryItems({ error, data }) {
        if (data) {
            this.historyItems = data.map(item => ({ 
                ...item, 
                isExpanded: false, 
                versions: [], 
                hasVersions: false,
                iconName: this.getIconName(false)
            }));
            this.updateLastUpdated();
        } else if (error) {
            // Handle error
        }
    }

    updateLastUpdated() {
        if (this.historyItems.length > 0) {
            const latestItem = this.historyItems.reduce((latest, item) => {
                const itemDate = new Date(item.Date__c);
                return itemDate > new Date(latest.Date__c) ? item : latest;
            }, this.historyItems[0]);
            const now = new Date();
            const lastUpdateTime = new Date(latestItem.Date__c);
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
        this.isModalOpen = true;
    }

    handleViewEdit(event) {
        this.currentRecordId = event.currentTarget.dataset.id;
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    handleSave() {
        // Handle save action if needed, this can be handled in the modal component
    }

    toggleShowVersions(event) {
        this.showVersions = event.target.checked;
        if (!this.showVersions) {
            this.historyItems = this.historyItems.map(item => ({ ...item, isExpanded: false }));
        }
    }
}
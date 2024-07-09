import { LightningElement, wire, track } from 'lwc';
import getHistoryItems from '@salesforce/apex/HistoryController.getHistoryItems';
import getHistoryVersions from '@salesforce/apex/HistoryController.getHistoryVersions';

export default class HistoryList extends LightningElement {
    @track historyItems;
    @track isModalOpen = false;
    @track currentRecordId;

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
        } else if (error) {
            // Handle error
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
}
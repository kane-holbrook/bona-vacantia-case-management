import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getAssetsLiabilitiesGrouped from '@salesforce/apex/AssetLiabilitiesController.getAssetsLiabilitiesGrouped';

export default class AssetsLiabilitiesList extends NavigationMixin(LightningElement) {
    @api recordUrl;
    @track recordTypeGroups;
    @track selectedRecordId;
    error;

    @wire(getAssetsLiabilitiesGrouped)
    wiredGroups({ error, data }) {
        if (data) {
            this.recordTypeGroups = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.recordTypeGroups = undefined;
        }
    }

    handleRecordClickBak(event) {
        event.preventDefault();
        const recordId = event.target.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                actionName: 'view'
            },
        });
    }

    handleRecordClick(event) {
        event.preventDefault();
        this.selectedRecordId = event.target.dataset.id;
        // The iframeSrc getter will recompute automatically
    }

    get recordTypeGroupsWithCounts() {
        if (this.recordTypeGroups) {
            return this.recordTypeGroups.map(group => ({
                ...group,
                labelWithCount: `${group.recordTypeName} (${group.records.length})`
            }));
        }
        return [];
    }

    get iframeSrc() {
        // Construct the URL for the iframe
        // You'll need the base URL of your Salesforce Org and the record ID
        return `${this.recordUrl}/${this.selectedRecordId}/view`;
    }
}
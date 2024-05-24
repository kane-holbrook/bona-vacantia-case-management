import { LightningElement, track, api } from 'lwc';

export default class DatabaseScreen extends LightningElement {
    @api recordId;
    @track recordTypeId;
    @track objectApiName;
    @track label;
    @track parentLabel;

    handleNavigation(event) {
        this.recordTypeId = event.detail.recordTypeId;
        this.objectApiName = event.detail.object;
        this.label = event.detail.label;
        this.parentLabel = event.detail.parentLabel;

        console.log('Object API Name:', this.objectApiName);
        console.log('Record Type ID:', this.recordTypeId);
        console.log('Label:', this.label);
        console.log('Parent Label:', this.parentLabel);
    }
}
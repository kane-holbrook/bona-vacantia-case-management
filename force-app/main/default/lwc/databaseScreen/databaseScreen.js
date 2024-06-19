import { LightningElement, track, api } from 'lwc';

export default class DatabaseScreen extends LightningElement {
    @api recordId;
    @track recordTypeId;
    @track objectApiName;
    @track label;
    @track parentLabel;
    @track parentGrandchildLabel;

    handleNavigation(event) {
        this.resetVariables();

        this.recordTypeId = event.detail.recordTypeId;
        this.objectApiName = event.detail.object;
        this.label = event.detail.label;
        this.parentLabel = event.detail.parentLabel;
        this.parentGrandchildLabel = event.detail.grandChildLabel;

        console.log(event.detail);

        console.log('Object API Name:', this.objectApiName);
        console.log('Record Type ID:', this.recordTypeId);
        console.log('Label:', this.label);
        console.log('Parent Label:', this.parentLabel);
        console.log('Parent Grandchild Label:', this.parentGrandchildLabel);
    }

    resetVariables() {
        this.recordTypeId = null;
        this.objectApiName = null;
        this.label = null;
        this.parentLabel = null;
        this.parentGrandchildLabel = null;
    }
}
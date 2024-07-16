import { LightningElement, track, api } from 'lwc';
import { setRecordId } from 'c/sharedService';

export default class DatabaseScreen extends LightningElement {
    @api recordId;
    @track recordTypeId;
    @track objectApiName;
    @track label;
    @track parentLabel;
    @track parentGrandchildLabel;
    @track parentGreatGrandchildLabel;

    connectedCallback() {
        this.dispatchRecordIdEvent();
        setRecordId(this.recordId); // Set the recordId in the shared service
    }

    dispatchRecordIdEvent() {
        const event = new CustomEvent('recordidavailable', {
            detail: { recordId: this.recordId },
            bubbles: true, // Allow the event to bubble up
            composed: true // Allow the event to cross the shadow DOM boundary
        });
        this.dispatchEvent(event);
    }

    handleNavigation(event) {
        this.resetVariables();

        this.recordTypeId = event.detail.recordTypeId;
        this.objectApiName = event.detail.object;
        this.label = event.detail.label;
        this.parentLabel = event.detail.parentLabel;
        this.parentGrandchildLabel = event.detail.grandChildLabel;
        this.parentGreatGrandchildLabel = event.detail.greatGrandChildLabel;

        console.log(event.detail);

        console.log('Object API Name:', this.objectApiName);
        console.log('Record Type ID:', this.recordTypeId);
        console.log('Label:', this.label);
        console.log('Parent Label:', this.parentLabel);
        console.log('Parent Grandchild Label:', this.parentGrandchildLabel);
        console.log('Parent Great Grandchild Label:', this.parentGreatGrandchildLabel);
    }

    resetVariables() {
        this.recordTypeId = null;
        this.objectApiName = null;
        this.label = null;
        this.parentLabel = null;
        this.parentGrandchildLabel = null;
        this.parentGreatGrandchildLabel = null;
    }
}
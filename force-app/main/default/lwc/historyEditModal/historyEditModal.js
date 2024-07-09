import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord, getRecord } from 'lightning/uiRecordApi';
import CASE_HISTORY_OBJECT from '@salesforce/schema/Case_History__c';
import ID_FIELD from '@salesforce/schema/Case_History__c.Id';
import DATE_INSERTED_FIELD from '@salesforce/schema/Case_History__c.Date_Inserted__c';
import ACTION_FIELD from '@salesforce/schema/Case_History__c.Action__c';
import DETAILS_FIELD from '@salesforce/schema/Case_History__c.Details__c';
import FLAG_IMPORTANT_FIELD from '@salesforce/schema/Case_History__c.Flag_as_important__c';

export default class HistoryEditModal extends LightningElement {
    @api recordId;
    @track dateInserted;
    @track description;
    @track details;
    @track flagImportant = false;

    @wire(getRecord, { recordId: '$recordId', fields: [DATE_INSERTED_FIELD, ACTION_FIELD, DETAILS_FIELD, FLAG_IMPORTANT_FIELD] })
    wiredRecord({ error, data }) {
        if (data) {
            this.dateInserted = data.fields.Date_Inserted__c.value;
            this.description = data.fields.Action__c.value;
            this.details = data.fields.Details__c.value;
            this.flagImportant = data.fields.Flag_as_important__c.value;
        } else if (error) {
            // Handle error
        }
    }

    handleInputChange(event) {
        const field = event.target.name;
        if (field === 'date-inserted') {
            this.dateInserted = event.target.value;
        } else if (field === 'description') {
            this.description = event.target.value;
        } else if (field === 'details') {
            this.details = event.target.value;
        } else if (field === 'flag-important') {
            this.flagImportant = event.target.checked;
        }
    }

    handleSave() {
        const fields = {};
        fields[DATE_INSERTED_FIELD.fieldApiName] = this.dateInserted;
        fields[ACTION_FIELD.fieldApiName] = this.description;
        fields[DETAILS_FIELD.fieldApiName] = this.details;
        fields[FLAG_IMPORTANT_FIELD.fieldApiName] = this.flagImportant;

        if (this.recordId) {
            fields[ID_FIELD.fieldApiName] = this.recordId;
            const recordInput = { fields };
            updateRecord(recordInput)
                .then(() => {
                    this.showToast('Success', 'Record updated successfully', 'success');
                    this.closeModal();
                })
                .catch(error => {
                    this.showToast('Error updating record', error.body.message, 'error');
                });
        } else {
            const recordInput = { apiName: CASE_HISTORY_OBJECT.objectApiName, fields };
            createRecord(recordInput)
                .then(() => {
                    this.showToast('Success', 'Record created successfully', 'success');
                    this.closeModal();
                })
                .catch(error => {
                    this.showToast('Error creating record', error.body.message, 'error');
                });
        }
    }

    handleCancel() {
        this.closeModal();
    }

    closeModal() {
        this.dispatchEvent(new CustomEvent('close'));
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
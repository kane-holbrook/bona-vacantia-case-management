import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord, getRecord } from 'lightning/uiRecordApi';
import CASE_HISTORY_OBJECT from '@salesforce/schema/Case_History__c';
import ID_FIELD from '@salesforce/schema/Case_History__c.Id';
import DATE_INSERTED_FIELD from '@salesforce/schema/Case_History__c.Date_Inserted__c';
import ACTION_FIELD from '@salesforce/schema/Case_History__c.Action__c';
import DETAILS_FIELD from '@salesforce/schema/Case_History__c.Details__c';
import FLAG_IMPORTANT_FIELD from '@salesforce/schema/Case_History__c.Flag_as_important__c';
import PARENT_HISTORY_RECORD_FIELD from '@salesforce/schema/Case_History__c.Parent_History_Record__c';

export default class HistoryEditModal extends LightningElement {
    @api recordId;
    @track dateInserted;
    @track description;
    @track details;
    @track flagImportant = false;
    @track fileData;
    @track fileName;
    @track isSubModalOpen = false;
    @track versions = [];

    versionColumns = [
        { label: 'Version', fieldName: 'versionNumber', type: 'number' },
        { label: 'Last Edited by', fieldName: 'lastModifiedByName', type: 'text' },
        { label: 'On', fieldName: 'lastModifiedDate', type: 'date' },
        { label: 'Action', type: 'button', typeAttributes: { label: 'Restore', name: 'restore', variant: 'base' } },
    ];

    @wire(getRecord, { recordId: '$recordId', fields: [DATE_INSERTED_FIELD, ACTION_FIELD, DETAILS_FIELD, FLAG_IMPORTANT_FIELD, PARENT_HISTORY_RECORD_FIELD] })
    wiredRecord({ error, data }) {
        if (data) {
            this.dateInserted = data.fields.Date_Inserted__c.value;
            this.description = data.fields.Action__c.value;
            this.details = data.fields.Details__c.value;
            this.flagImportant = data.fields.Flag_as_important__c.value;
            this.initialiseVersions();
        } else if (error) {
            // Handle error
        }
    }

    initialiseVersions() {
        // Load versions from the server
        this.versions = [{
            id: Date.now(),
            dateInserted: this.dateInserted,
            description: this.description,
            details: this.details,
            flagImportant: this.flagImportant,
            fileData: this.fileData,
            fileName: this.fileName,
            lastModifiedByName: 'Current User', // Replace with the actual user later
            lastModifiedDate: new Date().toLocaleDateString(),
            action: 'History item created',
            versionNumber: 1,
            class: 'slds-theme_shade'
        }];
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

    handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                this.fileData = reader.result;
                this.fileName = file.name;
            };
            reader.readAsDataURL(file);
        }
    }

    handleImport() {
        this.isSubModalOpen = true;
    }

    closeSubModal() {
        this.isSubModalOpen = false;
    }

    handleDocumentSave(event) {
        this.fileData = event.detail.fileData;
        this.fileName = event.detail.fileName;
        this.isSubModalOpen = false;
    }

    handleRemoveFile() {
        this.fileData = null;
        this.fileName = null;
    }

    handleSave() {
        // Save the current state before updating
        this.saveCurrentState();

        const fields = {};
        fields[DATE_INSERTED_FIELD.fieldApiName] = this.dateInserted;
        fields[ACTION_FIELD.fieldApiName] = this.description;
        fields[DETAILS_FIELD.fieldApiName] = this.details;
        fields[FLAG_IMPORTANT_FIELD.fieldApiName] = this.flagImportant;
        fields['Document__c'] = this.fileData;
        fields[PARENT_HISTORY_RECORD_FIELD.fieldApiName] = this.recordId;

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

    saveCurrentState() {
        const currentVersionNumber = this.versions.length + 1;
        const version = {
            id: Date.now(),
            dateInserted: this.dateInserted,
            description: this.description,
            details: this.details,
            flagImportant: this.flagImportant,
            fileData: this.fileData,
            fileName: this.fileName,
            lastModifiedByName: 'Current User', // Replace with the actual user later
            lastModifiedDate: new Date().toLocaleDateString(),
            action: 'History item created',
            versionNumber: currentVersionNumber,
            class: 'slds-theme_shade'
        };
        this.versions = [version, ...this.versions.map(v => ({ ...v, class: '' }))];
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'restore') {
            this.handleRestore(row.versionNumber);
        }
    }

    handleRestore(versionNumber) {
        const versionIndex = versionNumber - 1;
        const versionToRestore = this.versions[versionIndex];

        this.dateInserted = versionToRestore.dateInserted;
        this.description = versionToRestore.description;
        this.details = versionToRestore.details;
        this.flagImportant = versionToRestore.flagImportant;
        this.fileData = versionToRestore.fileData;
        this.fileName = versionToRestore.fileName;
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
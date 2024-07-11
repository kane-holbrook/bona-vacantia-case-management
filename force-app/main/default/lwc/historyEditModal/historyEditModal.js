import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord, getRecord } from 'lightning/uiRecordApi';
import CASE_HISTORY_OBJECT from '@salesforce/schema/Case_History__c';
import ID_FIELD from '@salesforce/schema/Case_History__c.Id';
import DATE_INSERTED_FIELD from '@salesforce/schema/Case_History__c.Date_Inserted__c';
import ACTION_FIELD from '@salesforce/schema/Case_History__c.Action__c';
import DETAILS_FIELD from '@salesforce/schema/Case_History__c.Details__c';
import FLAG_IMPORTANT_FIELD from '@salesforce/schema/Case_History__c.Flag_as_important__c';
import BV_CASE_FIELD from '@salesforce/schema/Case_History__c.BV_Case__c';
import PARENT_HISTORY_RECORD_FIELD from '@salesforce/schema/Case_History__c.Parent_History_Record__c';
import getHistoryVersions from '@salesforce/apex/HistoryController.getHistoryVersions';

export default class HistoryEditModal extends LightningElement {
    @api record;
    @track dateInserted;
    @track description;
    @track details;
    @track flagImportant = false;
    @track fileData;
    @track fileName;
    @track bvCaseId;
    @track isSubModalOpen = false;
    @track versions = [];

    versionColumns = [
        { label: 'Version', fieldName: 'versionNumber', type: 'number' },
        { label: 'Last Edited by', fieldName: 'lastModifiedByName', type: 'text' },
        { label: 'On', fieldName: 'lastModifiedDate', type: 'date' },
        { label: 'Action', fieldName: 'action', type: 'text' },
    ];

    connectedCallback() {
        this.dateInserted = this.record.Date_Inserted__c || '';
        this.description = this.record.Action__c || '';
        this.details = this.record.Details__c || '';
        this.flagImportant = this.record.Flag_as_important__c || false;
        this.bvCaseId = this.record.BV_Case__c || '';
    }

    @wire(getHistoryVersions, { historyItemId: '$record.Id' })
    wiredVersions({ error, data }) {
        if (data) {
            this.versions = [{
                id: 'initial',
                dateInserted: this.dateInserted,
                description: 'Initial version',
                details: this.details,
                flagImportant: this.flagImportant,
                fileData: this.fileData,
                fileName: this.fileName,
                bvCaseId: this.bvCaseId,
                lastModifiedByName: 'Initial User', // Replace with actual user data if available
                lastModifiedDate: this.dateInserted, // Replace with the actual created date if available
                action: 'History item created',
                versionNumber: 1,
                class: 'slds-theme_shade'
            },
            ...data.map((version, index) => ({
                id: version.Id,
                dateInserted: version.Date_Inserted__c,
                description: version.Action__c,
                details: version.Details__c,
                flagImportant: version.Flag_as_important__c,
                fileData: this.fileData,
                fileName: this.fileName,
                bvCaseId: version.BV_Case__c,
                lastModifiedByName: 'User', // Replace with actual user data if available
                lastModifiedDate: version.Date_Inserted__c, // Replace with the actual modified date if available
                action: version.Action__c, // Use description as action
                versionNumber: index + 2,
                class: 'slds-theme_shade'
            }))];
        } else if (error) {
            console.log('Error fetching versions:', error);
            this.showToast('Error', 'Error fetching versions', 'error');
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

    @api
    saveRecord(parentRecordId) {
        let fields = {
            [DATE_INSERTED_FIELD.fieldApiName]: this.dateInserted,
            [ACTION_FIELD.fieldApiName]: this.description,
            [DETAILS_FIELD.fieldApiName]: this.details,
            [FLAG_IMPORTANT_FIELD.fieldApiName]: this.flagImportant
        };

        if (this.record.Id) {
            // Create a new version before updating the existing record
            this.createVersion(this.record.Id, fields, parentRecordId);

            fields[ID_FIELD.fieldApiName] = this.record.Id;
            const recordInput = { fields };
            updateRecord(recordInput)
                .then(() => {
                    this.dispatchEvent(new CustomEvent('save'));
                })
                .catch(error => {
                    console.log('Error updating record', error);
                    this.showToast('Error updating record', error.body.message, 'error');
                });
        } else {
            fields[BV_CASE_FIELD.fieldApiName] = parentRecordId;
            const recordInput = { apiName: CASE_HISTORY_OBJECT.objectApiName, fields };
            createRecord(recordInput)
                .then(() => {
                    this.dispatchEvent(new CustomEvent('save'));
                })
                .catch(error => {
                    console.log('Error creating record', error);
                    this.showToast('Error creating record', error.body.message, 'error');
                });
        }
    }

    createVersion(parentRecordId, fields, bvCaseId) {
        let versionFields = {
            [PARENT_HISTORY_RECORD_FIELD.fieldApiName]: parentRecordId,
            [DATE_INSERTED_FIELD.fieldApiName]: this.dateInserted,
            [ACTION_FIELD.fieldApiName]: this.description,
            [DETAILS_FIELD.fieldApiName]: this.details,
            [FLAG_IMPORTANT_FIELD.fieldApiName]: this.flagImportant,
            [BV_CASE_FIELD.fieldApiName]: bvCaseId
        };

        console.log(versionFields);

        const recordInput = { apiName: CASE_HISTORY_OBJECT.objectApiName, fields: versionFields };
        createRecord(recordInput)
            .then(() => {
                // Version created successfully
            })
            .catch(error => {
                console.log('Error creating version', error);
                this.showToast('Error creating version', error.body.message, 'error');
            });
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
            bvCaseId: this.bvCaseId,
            lastModifiedByName: 'Current User', // Replace with the actual user later
            lastModifiedDate: new Date().toLocaleDateString(),
            action: this.description, // Use description as action
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
        this.bvCaseId = versionToRestore.bvCaseId;
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

    formatDate(dateStr) {
        // Assuming dateStr is in the format 'DD/MM/YYYY'
        const [day, month, year] = dateStr.split('/');
        const date = new Date(`${year}-${month}-${day}`);
        return date.toISOString(); // Converts to 'YYYY-MM-DDTHH:MM:SS.sssZ' format
    }
}
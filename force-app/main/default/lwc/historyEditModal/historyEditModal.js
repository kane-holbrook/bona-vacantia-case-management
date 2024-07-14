import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord } from 'lightning/uiRecordApi';
import CASE_HISTORY_OBJECT from '@salesforce/schema/Case_History__c';
import ID_FIELD from '@salesforce/schema/Case_History__c.Id';
import DATE_INSERTED_FIELD from '@salesforce/schema/Case_History__c.Date_Inserted__c';
import ACTION_FIELD from '@salesforce/schema/Case_History__c.Action__c';
import DETAILS_FIELD from '@salesforce/schema/Case_History__c.Details__c';
import FLAG_IMPORTANT_FIELD from '@salesforce/schema/Case_History__c.Flag_as_important__c';
import BV_CASE_FIELD from '@salesforce/schema/Case_History__c.BV_Case__c';
import PARENT_HISTORY_RECORD_FIELD from '@salesforce/schema/Case_History__c.Parent_History_Record__c';
import CONTENT_VERSION_OBJECT from '@salesforce/schema/ContentVersion';
import TITLE_FIELD from '@salesforce/schema/ContentVersion.Title';
import VERSION_DATA_FIELD from '@salesforce/schema/ContentVersion.VersionData';
import LINKED_ENTITY_ID_FIELD from '@salesforce/schema/ContentVersion.FirstPublishLocationId';
import PATH_ON_CLIENT_FIELD from '@salesforce/schema/ContentVersion.PathOnClient';
import getHistoryVersions from '@salesforce/apex/HistoryController.getHistoryVersions';

export default class HistoryEditModal extends LightningElement {
    @api record;
    @track dateInserted;
    @track description;
    @track details;
    @track flagImportant = false;
    @track fileData;
    @track fileName;
    @track fileSize;
    @track documentType;
    @track correspondenceWith;
    @track draft;
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

        if (this.record.fileName) {
            this.fileName = this.record.fileName;
            this.fileSize = this.record.fileSize;
            this.fileData = this.record.fileData;
            this.documentType = this.record.documentType;
            this.correspondenceWith = this.record.correspondenceWith;
            this.draft = this.record.draft;
        }
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
        this.fileData = event.detail.fileData;
        this.fileName = event.detail.fileName;
        this.fileSize = event.detail.fileSize;
        this.documentType = event.detail.documentType;
        this.correspondenceWith = event.detail.correspondenceWith;
        this.draft = event.detail.draft;
    }

    handleFileRemove() {
        this.fileData = null;
        this.fileName = null;
        this.fileSize = null;
        this.documentType = null;
        this.correspondenceWith = null;
        this.draft = null;
    }

    handleImport() {
        this.isSubModalOpen = true;
    }

    handleViewEdit() {
        this.isSubModalOpen = true;
    }

    closeSubModal() {
        this.isSubModalOpen = false;
    }

    handleSave() {
        this.closeSubModal();
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
                    if (this.fileData) {
                        this.saveFile(this.record.Id);
                    } else {
                        this.dispatchEvent(new CustomEvent('save'));
                    }
                })
                .catch(error => {
                    console.log('Error updating record', error);
                    this.showToast('Error updating record', error.body.message, 'error');
                });
        } else {
            fields[BV_CASE_FIELD.fieldApiName] = parentRecordId;
            const recordInput = { apiName: CASE_HISTORY_OBJECT.objectApiName, fields };
            createRecord(recordInput)
                .then(record => {
                    if (this.fileData) {
                        this.saveFile(record.id);
                    } else {
                        this.dispatchEvent(new CustomEvent('save'));
                    }
                })
                .catch(error => {
                    console.log('Error creating record', error);
                    this.showToast('Error creating record', error.body.message, 'error');
                });
        }
    }

    saveFile(historyRecordId) {
        this.createContentVersion({
            title: this.fileName,
            versionData: this.fileData,
            linkedEntityId: historyRecordId
        })
        .then(() => {
            this.showToast('Success', 'File uploaded successfully', 'success');
            this.dispatchEvent(new CustomEvent('save'));
        })
        .catch(error => {
            console.log('Error saving file', error);
            this.showToast('Error', 'Error saving file', 'error');
        });
    }

    createContentVersion({ title, versionData, linkedEntityId }) {
        const base64Data = versionData.split(',')[1];
        
        const fields = {};
        fields[TITLE_FIELD.fieldApiName] = title;
        fields[VERSION_DATA_FIELD.fieldApiName] = base64Data;
        fields[LINKED_ENTITY_ID_FIELD.fieldApiName] = linkedEntityId;
        fields[PATH_ON_CLIENT_FIELD.fieldApiName] = title;
    
        const recordInput = { apiName: CONTENT_VERSION_OBJECT.objectApiName, fields };

        console.log(recordInput);
        return createRecord(recordInput);
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

    closeModal() {
        this.isSubModalOpen = false;
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
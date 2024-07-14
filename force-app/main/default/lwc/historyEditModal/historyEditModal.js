import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord, deleteRecord } from 'lightning/uiRecordApi';
import CASE_HISTORY_OBJECT from '@salesforce/schema/Case_History__c';
import ID_FIELD from '@salesforce/schema/Case_History__c.Id';
import DATE_INSERTED_FIELD from '@salesforce/schema/Case_History__c.Date_Inserted__c';
import ACTION_FIELD from '@salesforce/schema/Case_History__c.Action__c';
import DETAILS_FIELD from '@salesforce/schema/Case_History__c.Details__c';
import FLAG_IMPORTANT_FIELD from '@salesforce/schema/Case_History__c.Flag_as_important__c';
import BV_CASE_FIELD from '@salesforce/schema/Case_History__c.BV_Case__c';
import PARENT_HISTORY_RECORD_FIELD from '@salesforce/schema/Case_History__c.Parent_History_Record__c';
import SHDOCUMENT_OBJECT from '@salesforce/schema/SHDocument__c';
import SHDOCUMENT_NAME_FIELD from '@salesforce/schema/SHDocument__c.Name';
import DOCUMENT_EXTENSION_FIELD from '@salesforce/schema/SHDocument__c.DocumentExtension__c';
import DOCUMENT_ID_FIELD from '@salesforce/schema/SHDocument__c.DocumentID__c';
import DOCUMENT_TYPE_FIELD from '@salesforce/schema/SHDocument__c.DocumentType__c';
import DOCUMENT_CORRESPONDENCE_WITH_FIELD from '@salesforce/schema/SHDocument__c.Correspondence_With__c';
import DOCUMENT_DRAFT_FIELD from '@salesforce/schema/SHDocument__c.Draft__c';
import SERVER_RELATIVE_URL_FIELD from '@salesforce/schema/SHDocument__c.ServerRelativeURL__c';
import DOCUMENT_FILE_SIZE_FIELD from '@salesforce/schema/SHDocument__c.FileSize__c';
import CASE_HISTORY_FIELD from '@salesforce/schema/SHDocument__c.Case_History__c';
import getHistoryVersions from '@salesforce/apex/HistoryController.getHistoryVersions';
import uploadFileToSharePoint from '@salesforce/apex/FileController.uploadFileToSharePoint';
import getCaseName from '@salesforce/apex/FileController.getCaseName';
import deleteSharepointFile from '@salesforce/apex/FileController.deleteSharepointFile';

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
    @track originalRecord = {};
    @track originalDocumentId; // Added to keep track of the original document ID

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
            this.originalDocumentId = this.record.documentId; // Keep track of the original document ID
        }

        console.log('history record', this.record);

        // Store the original state for comparison
        this.originalRecord = {
            dateInserted: this.dateInserted,
            description: this.description,
            details: this.details,
            flagImportant: this.flagImportant,
            fileName: this.fileName,
            fileSize: this.fileSize,
            documentType: this.documentType,
            correspondenceWith: this.correspondenceWith,
            draft: this.draft
        };
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
                fileName: this.fileName,
                fileSize: this.fileSize,
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
                fileName: this.fileName,
                fileSize: this.fileSize,
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

    handleFieldChange(event) {
        this.documentType = event.detail.documentType;
        this.correspondenceWith = event.detail.correspondenceWith;
        this.draft = event.detail.draft;
    }

    handleFileRemove() {
        if (this.originalDocumentId) {
            getCaseName({ caseId: this.bvCaseId })
                .then((caseName) => {
                    const folderName = `${caseName}/${this.record.Id}`;
                    deleteSharepointFile({ caseId: folderName, fileName: this.fileName })
                        .then(() => {
                            deleteRecord(this.originalDocumentId)
                                .then(() => {
                                    this.showToast('Success', 'File and record deleted successfully', 'success');
                                    this.fileData = null;
                                    this.fileName = null;
                                    this.fileSize = null;
                                    this.documentType = null;
                                    this.correspondenceWith = null;
                                    this.draft = null;
                                    this.originalDocumentId = null;
                                })
                                .catch(error => {
                                    console.log('Error deleting SHDocument record', error);
                                    this.showToast('Error', 'Error deleting SHDocument record', 'error');
                                });
                        })
                        .catch(error => {
                            console.log('Error deleting SharePoint file', error);
                            this.showToast('Error', 'Error deleting SharePoint file', 'error');
                        });
                })
                .catch(error => {
                    console.log('Error fetching case name', error);
                    this.showToast('Error', 'Error fetching case name', 'error');
                });
        }
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
            // Check for changes before creating a new version
            if (this.hasChanges()) {
                this.createVersion(this.record.Id, fields, parentRecordId);
            }

            fields[ID_FIELD.fieldApiName] = this.record.Id;
            const recordInput = { fields };
            updateRecord(recordInput)
                .then(() => {
                    if (this.fileName !== this.originalRecord.fileName || this.fileSize !== this.originalRecord.fileSize) {
                        if (this.originalDocumentId) {
                            getCaseName({ caseId: this.bvCaseId })
                                .then((caseName) => {
                                    const folderName = `${caseName}/${this.record.Id}`;
                                    deleteSharepointFile({ caseId: folderName, fileName: this.fileName })
                                        .then(() => {
                                            this.saveFile(this.record.Id, 'Document replaced');
                                        })
                                        .catch(error => {
                                            console.log('Error deleting original SharePoint file', error);
                                            this.showToast('Error', 'Error deleting original SharePoint file', 'error');
                                        });
                                })
                                .catch(error => {
                                    console.log('Error fetching case name', error);
                                    this.showToast('Error', 'Error fetching case name', 'error');
                                });
                        } else {
                            this.saveFile(this.record.Id, 'Document added');
                        }
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
                    if (this.fileName && this.fileSize) {
                        this.saveFile(record.id, 'Document added');
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

    saveFile(historyRecordId, action) {
        const base64Data = this.fileData.split(',')[1];

        // Fetch the case name
        getCaseName({ caseId: this.bvCaseId })
            .then((caseName) => {
                const folderName = `${caseName}/${historyRecordId}`;

                console.log('documentType', this.documentType);
                uploadFileToSharePoint({
                    folderName: '/'+ folderName,
                    fileName: this.fileName,
                    base64Data: base64Data,
                    documentType: this.documentType
                })
                    .then((serverRelativeUrl) => {
                        this.showToast('Success', 'File uploaded successfully', 'success');
                        this.createSHDocumentRecord(historyRecordId, serverRelativeUrl, action);
                    })
                    .catch(error => {
                        console.log('Error saving file', error);
                        this.showToast('Error', 'Error saving file', 'error');
                    });
            })
            .catch(error => {
                console.log('Error fetching case name', error);
                this.showToast('Error', 'Error fetching case name', 'error');
            });
    }

    createSHDocumentRecord(historyRecordId, serverRelativeUrl, action) {
        const shDocumentFields = {
            [SHDOCUMENT_NAME_FIELD.fieldApiName]: this.fileName,
            [DOCUMENT_EXTENSION_FIELD.fieldApiName]: this.fileName.split('.').pop(),
            [DOCUMENT_ID_FIELD.fieldApiName]: historyRecordId,
            [DOCUMENT_TYPE_FIELD.fieldApiName]: this.documentType,
            [DOCUMENT_FILE_SIZE_FIELD.fieldApiName]: this.fileSize,
            [DOCUMENT_CORRESPONDENCE_WITH_FIELD.fieldApiName]: this.correspondenceWith,
            [DOCUMENT_DRAFT_FIELD.fieldApiName]: this.draft,
            [SERVER_RELATIVE_URL_FIELD.fieldApiName]: serverRelativeUrl,
            [CASE_HISTORY_FIELD.fieldApiName]: historyRecordId
        };

        const recordInput = { apiName: SHDOCUMENT_OBJECT.objectApiName, fields: shDocumentFields };
        createRecord(recordInput)
            .then((documentRecord) => {
                this.originalDocumentId = documentRecord.id;
                this.updateHistoryAction(historyRecordId, action);
            })
            .catch(error => {
                console.log('Error creating SHDocument record', error);
                this.showToast('Error', 'Error creating SHDocument record', 'error');
            });
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
                this.showToast('Error', 'Error creating version', error.body.message, 'error');
            });
    }

    updateHistoryAction(historyRecordId, action) {
        const fields = {
            [ID_FIELD.fieldApiName]: historyRecordId,
            [ACTION_FIELD.fieldApiName]: action
        };

        const recordInput = { fields };
        updateRecord(recordInput)
            .then(() => {
                this.dispatchEvent(new CustomEvent('save'));
            })
            .catch(error => {
                console.log('Error updating history action', error);
                this.showToast('Error', 'Error updating history action', 'error');
            });
    }

    hasChanges() {
        return this.dateInserted !== this.originalRecord.dateInserted ||
               this.description !== this.originalRecord.description ||
               this.details !== this.originalRecord.details ||
               this.flagImportant !== this.originalRecord.flagImportant ||
               this.fileName !== this.originalRecord.fileName ||
               this.fileSize !== this.originalRecord.fileSize ||
               this.documentType !== this.originalRecord.documentType ||
               this.correspondenceWith !== this.originalRecord.correspondenceWith ||
               this.draft !== this.originalRecord.draft;
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
        this.fileName = versionToRestore.fileName;
        this.fileSize = versionToRestore.fileSize;
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
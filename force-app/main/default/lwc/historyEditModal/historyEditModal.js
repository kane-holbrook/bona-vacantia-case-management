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
import CASE_OFFICER_FIELD from '@salesforce/schema/Case_History__c.Case_Officer__c';
import LAST_UPDATED_FIELD from '@salesforce/schema/Case_History__c.Last_updated__c';
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
import USER_ID from '@salesforce/user/Id';
import getSHDocuments from '@salesforce/apex/HistoryController.getSHDocuments';
import uploadFileToSharePoint from '@salesforce/apex/FileControllerGraph.uploadFileToSharePoint';
import getCaseName from '@salesforce/apex/FileControllerGraph.getCaseName';
import deleteSharepointFile from '@salesforce/apex/FileControllerGraph.deleteFileFromSharePoint';
import getSharePointSettings from '@salesforce/apex/FileController.getSharePointSettings';

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
    @track serverRelativeURL;
    @track bvCaseId;
    @track isSubModalOpen = false;
    @track relatedItems = [];
    @track originalRecord = {};
    @track originalDocumentId; // Added to keep track of the original document ID
    fullURL;
    sharePointSiteUrl;
    sharePointDirectoryPath;

    userId = USER_ID; // Get the current user ID

    relatedItemColumns = [
        { label: 'Document Name', fieldName: 'Name', type: 'text' },
        { label: 'Document Type', fieldName: 'DocumentType__c', type: 'text' },
        { label: 'File Size', fieldName: 'FileSize__c', type: 'text' },
        { label: 'Created Time', fieldName: 'Created_Time__c', type: 'date' },
        {
            label: 'Actions',
            type: 'action',
            typeAttributes: {
                rowActions: [
                    { label: 'View/Edit', name: 'viewEdit' },
                    { label: 'Delete', name: 'delete' }
                ]
            }
        }
    ];

    connectedCallback() {
        this.dateInserted = this.record.Date_Inserted__c || '';
        this.description = this.record.Action__c || '';
        this.details = this.record.Details__c || '';
        this.flagImportant = this.record.Flag_as_important__c || false;
        this.bvCaseId = this.record.BV_Case__c || '';

        console.log('history record', this.record);

        // Store the original state for comparison
        this.originalRecord = {
            dateInserted: this.dateInserted,
            description: this.description,
            details: this.details,
            flagImportant: this.flagImportant
        };

        // Fetch SharePoint settings
        getSharePointSettings()
        .then(result => {
            this.sharePointSiteUrl = result.SharePoint_Site_URL;
            this.sharePointDirectoryPath = result.SharePoint_Directory_Path;
            this.constructFullURL();
        })
        .catch(error => {
            console.error('Error fetching SharePoint settings:', error);
            this.showToast('Error', 'Error fetching SharePoint settings', 'error');
        });

        // Fetch related items
        this.fetchRelatedItems();
    }

    constructFullURL() {
        if (this.sharePointSiteUrl && this.serverRelativeURL) {
            const decodedServerRelativeURL = decodeURIComponent(this.serverRelativeURL).replace(/%2F/g, '/');
            const parentFolderPath = '123'; // Adjust this as needed, no need for encodeURIComponent
            const previewPageUrl = `${this.sharePointSiteUrl}/${this.sharePointDirectoryPath}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(decodedServerRelativeURL)}&parent=${parentFolderPath}`;
            this.fullURL = previewPageUrl;
        }
    }

    fetchRelatedItems() {
        getSHDocuments({ parentId: this.record.Id })
            .then(result => {
                this.relatedItems = result.map(doc => ({
                    ...doc,
                    FileSize__c: this.formatFileSize(doc.FileSize__c)
                }));
            })
            .catch(error => {
                console.error('Error fetching related items:', error);
                this.showToast('Error', 'Error fetching related items', 'error');
            });
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
        this.serverRelativeURL = event.detail.serverRelativeURL;
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
                    deleteSharepointFile({ filePath: folderName, fileName: this.fileName })
                        .then(() => {
                            deleteRecord(this.originalDocumentId)
                                .then(() => {
                                    this.showToast('Success', 'File and record deleted successfully', 'success');
                                    this.fileData = null;
                                    this.fileName = null;
                                    this.serverRelativeURL = null;
                                    this.fileSize = null;
                                    this.documentType = null;
                                    this.correspondenceWith = null;
                                    this.draft = null;
                                    this.originalDocumentId = null;
                                    this.fetchRelatedItems(); // Refresh related items
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
            [FLAG_IMPORTANT_FIELD.fieldApiName]: this.flagImportant,
            [CASE_OFFICER_FIELD.fieldApiName]: this.userId, // Set the current user's ID
            [LAST_UPDATED_FIELD.fieldApiName]: new Date().toISOString() // Set current date and time
        };

        if (this.record.Id) {
            fields[ID_FIELD.fieldApiName] = this.record.Id;
            const recordInput = { fields };
            updateRecord(recordInput)
                .then(() => {
                    if (this.fileName !== this.originalRecord.fileName || this.fileSize !== this.originalRecord.fileSize) {
                        if (this.originalDocumentId) {
                            getCaseName({ caseId: this.bvCaseId })
                                .then((caseName) => {
                                    const folderName = `${caseName}/${this.record.Id}`;
                                    deleteSharepointFile({ filePath: folderName, fileName: this.fileName })
                                        .then(() => {
                                            if (this.fileData) {
                                                this.saveFile(this.record.Id, 'Document replaced');
                                            }
                                        })
                                        .catch(error => {
                                            console.log('Error deleting original SharePoint file', error);
                                            this.showToast('Error', 'Error deleting original SharePoint file', 'error');
                                        });
                                })
                                .catch(error => {
                                    console.log('Error fetching case name', error);
                                    this.showToast('Error fetching case name', 'error');
                                });
                        } else {
                            if (this.fileData) {
                                this.saveFile(this.record.Id, 'Document added');
                            }
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
                        if (this.fileData) {
                            this.saveFile(record.id, 'Document added');
                        }
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
        if (!this.fileData) {
            console.log('No file data available to save.');
            return;
        }

        const base64Data = this.fileData.split(',')[1];

        // Decode the base64 encoded data
        const binaryData = window.atob(base64Data);

        // Fetch the case name
        getCaseName({ caseId: this.bvCaseId })
            .then((caseName) => {
                const folderName = `${caseName}/${historyRecordId}`;

                console.log('documentType', this.documentType);
                uploadFileToSharePoint({
                    filePath: folderName,
                    fileName: this.fileName,
                    fileContent: binaryData,
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
                this.fetchRelatedItems(); // Refresh related items
            })
            .catch(error => {
                console.log('Error creating SHDocument record', error);
                this.showToast('Error', 'Error creating SHDocument record', 'error');
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

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'delete') {
            this.handleDeleteRelatedItem(row.Id);
        } else if (actionName === 'viewEdit') {
            this.handleViewEditRelatedItem(row);
        }
    }

    handleDeleteRelatedItem(relatedItemId) {
        deleteRecord(relatedItemId)
            .then(() => {
                this.showToast('Success', 'Related item deleted successfully', 'success');
                this.fetchRelatedItems(); // Refresh related items
            })
            .catch(error => {
                console.error('Error deleting related item:', error);
                this.showToast('Error', 'Error deleting related item', 'error');
            });
    }

    handleViewEditRelatedItem(relatedItem) {
        // Handle the logic to view/edit the related item
        // This can open a modal or perform any other required actions
        // Example: Open a modal with the details of the selected related item
        this.fileName = relatedItem.Name;
        this.fileSize = relatedItem.FileSize__c;
        this.fileData = relatedItem.FileContent__c;
        this.documentType = relatedItem.DocumentType__c;
        this.correspondenceWith = relatedItem.Correspondence_With__c;
        this.draft = relatedItem.Draft__c;
        this.serverRelativeURL = relatedItem.ServerRelativeURL__c;
        this.isSubModalOpen = true;
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

    formatFileSize(size) {
        if (size < 1024) {
            return size + ' B';
        } else if (size < 1024 * 1024) {
            return (size / 1024).toFixed(2) + ' kB';
        } else if (size < 1024 * 1024 * 1024) {
            return (size / (1024 * 1024)).toFixed(2) + ' MB';
        } else {
            return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }
    }
}
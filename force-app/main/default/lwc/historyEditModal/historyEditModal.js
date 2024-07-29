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
import CASE_OFFICER_FIELD from '@salesforce/schema/Case_History__c.Case_Officer__c';
import LAST_UPDATED_FIELD from '@salesforce/schema/Case_History__c.Last_updated__c';
import USER_ID from '@salesforce/user/Id';
import getSHDocuments from '@salesforce/apex/HistoryController.getSHDocuments';
import uploadFileToSharePoint from '@salesforce/apex/FileControllerGraph.uploadFileToSharePoint';
import getCaseName from '@salesforce/apex/FileControllerGraph.getCaseName';
import deleteSharepointFile from '@salesforce/apex/FileControllerGraph.deleteFileFromSharePoint';
import getSharePointSettings from '@salesforce/apex/FileControllerGraph.getSharePointSettings';
import { refreshApex } from '@salesforce/apex';
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
import CREATED_TIME_FIELD from '@salesforce/schema/SHDocument__c.Created_Time__c';

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

    wiredRelatedItemsResult; // Track the wired result for refresh

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
    }

    constructFullURL() {
        if (this.sharePointSiteUrl && this.serverRelativeURL) {
            const decodedServerRelativeURL = decodeURIComponent(this.serverRelativeURL).replace(/%2F/g, '/');
            const parentFolderPath = '123'; // Adjust this as needed, no need for encodeURIComponent
            const previewPageUrl = `${this.sharePointSiteUrl}/${this.sharePointDirectoryPath}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(decodedServerRelativeURL)}&parent=${parentFolderPath}`;
            this.fullURL = previewPageUrl;
        }
    }

    @wire(getSHDocuments, { parentId: '$record.Id' })
    wiredRelatedItems(result) {
        this.wiredRelatedItemsResult = result; // Store the result for refresh
        if (result.data) {
            this.relatedItems = result.data.map(doc => ({
                ...doc,
                FileSize__c: this.formatFileSize(doc.FileSize__c)
            }));
        } else if (result.error) {
            console.error('Error fetching related items:', result.error);
            this.showToast('Error', 'Error fetching related items', 'error');
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
                                    refreshApex(this.wiredRelatedItemsResult); // Refresh related items
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
        // If there's no file data, show an error message and return
        if (!this.fileData) {
            this.showToast('Error', 'No file data available to save.', 'error');
            return;
        }

        const base64Data = this.fileData.split(',')[1];
        const binaryData = window.atob(base64Data);

        getCaseName({ caseId: this.bvCaseId })
            .then((caseName) => {
                const folderName = `${caseName}/${this.record.Id}`;

                uploadFileToSharePoint({
                    filePath: folderName,
                    fileName: this.fileName,
                    fileContent: binaryData,
                    documentType: this.documentType
                })
                    .then((serverRelativeUrl) => {
                        this.serverRelativeURL = serverRelativeUrl; // Update the serverRelativeURL after successful upload
                        this.showToast('Success', 'File uploaded successfully', 'success');
                        this.createSHDocumentRecord(this.record.Id, serverRelativeUrl, this.description); // Attach document to history record
                        refreshApex(this.wiredRelatedItemsResult); // Refresh related items
                        this.closeSubModal();
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
            [SERVER_RELATIVE_URL_FIELD.fieldApiName]: this.sharePointDirectoryPath + '/' + 'Shared%20Documents' + '/' + serverRelativeUrl + '/' + this.fileName,
            [CREATED_TIME_FIELD.fieldApiName]: new Date(),
            [CASE_HISTORY_FIELD.fieldApiName]: historyRecordId
        };

        const recordInput = { apiName: SHDOCUMENT_OBJECT.objectApiName, fields: shDocumentFields };
        createRecord(recordInput)
            .then((documentRecord) => {
                this.originalDocumentId = documentRecord.id;
                this.showToast('Success', 'SHDocument record created successfully', 'success');
                refreshApex(this.wiredRelatedItemsResult); // Refresh related items
            })
            .catch(error => {
                console.log('Error creating SHDocument record', error);
                this.showToast('Error', 'Error creating SHDocument record', 'error');
            });
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
                .then(record => {
                    this.dispatchEvent(new CustomEvent('save'));
                })
                .catch(error => {
                    console.log('Error creating record', error);
                    this.showToast('Error creating record', error.body.message, 'error');
                });
        }
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
        // Fetch the related item details first
        getSHDocuments({ parentId: this.record.Id })
            .then(result => {
                const relatedItem = result.find(item => item.Id === relatedItemId);
                if (relatedItem) {
                    // Extract necessary details
                    const { ServerRelativeURL__c: serverRelativeURL, Name: fileName } = relatedItem;
    
                    // Extract the part of the URL needed for deletion dynamically
                    const urlParts = serverRelativeURL.split('/Shared%20Documents/');
                    let relativePath = urlParts.length > 1 ? urlParts[1] : serverRelativeURL;

                    // Strip the fileName from the relativePath
                    if (relativePath.endsWith(fileName)) {
                        relativePath = relativePath.slice(0, -fileName.length - 1); // Remove the fileName and the preceding slash
                    }
    
                    // Call the deleteSharepointFile method first
                    deleteSharepointFile({ filePath: relativePath, fileName })
                        .then(() => {
                            // After deleting the SharePoint file, delete the Salesforce record
                            deleteRecord(relatedItemId)
                                .then(() => {
                                    this.showToast('Success', 'Related item and SharePoint file deleted successfully', 'success');
                                    refreshApex(this.wiredRelatedItemsResult); // Refresh related items
                                })
                                .catch(error => {
                                    console.error('Error deleting related item:', error);
                                    this.showToast('Error', 'Error deleting related item', 'error');
                                });
                        })
                        .catch(error => {
                            console.error('Error deleting SharePoint file:', error);
                            this.showToast('Error', 'Error deleting SharePoint file', 'error');
                        });
                } else {
                    this.showToast('Error', 'Related item not found', 'error');
                }
            })
            .catch(error => {
                console.error('Error fetching related items:', error);
                this.showToast('Error', 'Error fetching related items', 'error');
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
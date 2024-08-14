import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord, deleteRecord } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
import { getRecordId } from 'c/sharedService';
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

export default class HistoryEditModal extends NavigationMixin(LightningElement) {
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
    @track originalDocumentId;
    @track isEmailHistory = false; // Track if it's an email history record
    @track contentDocumentId;
    @track isConvertToPDFModalOpen = false;

    // Email related fields
    @track emailMessageId;
    @track emailMessageSubject;
    @track emailMessageFrom;
    @track emailMessageTo;
    @track emailMessageCc;
    @track emailMessageBcc;
    @track emailMessageStatus;

    fullURL;
    sharePointSiteUrl;
    sharePointDirectoryPath;

    wiredRelatedItemsResult;

    userId = USER_ID;

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
        this.dateInserted = this.record.Date_Inserted__c || this.getTodayDate();
        this.description = this.record.Action__c || '';
        this.details = this.record.Details__c || '';
        this.flagImportant = this.record.Flag_as_important__c || false;
        this.bvCaseId = this.record.BV_Case__c || getRecordId();

        // Check if this is an email history record
        this.isEmailHistory = !!this.record.emailMessageSubject;

        if (this.isEmailHistory) {
            // Populate email-related fields
            this.emailMessageId = this.record.emailMessageId;
            this.emailMessageSubject = this.record.emailMessageSubject;
            this.emailMessageFrom = this.record.emailMessageFrom;
            this.emailMessageTo = this.record.emailMessageTo;
            this.emailMessageCc = this.record.emailMessageCc;
            this.emailMessageBcc = this.record.emailMessageBcc;
            this.emailMessageStatus = this.record.emailMessageStatus;
        }

        this.originalRecord = {
            dateInserted: this.dateInserted,
            description: this.description,
            details: this.details,
            flagImportant: this.flagImportant
        };

        if (this.record.fileName) {
            this.originalDocumentId = this.record.documentId;
        }

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
            const parentFolderPath = '123';
            const previewPageUrl = `${this.sharePointSiteUrl}/${this.sharePointDirectoryPath}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(decodedServerRelativeURL)}&parent=${parentFolderPath}`;
            this.fullURL = previewPageUrl;
        }
    }

    @wire(getSHDocuments, { parentId: '$record.Id' })
    wiredRelatedItems(result) {
        this.wiredRelatedItemsResult = result;
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

    handleViewEditEmailLog() {
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.emailMessageId,
                objectApiName: 'EmailMessage',
                actionName: 'view'
            }
        }).then(url => {
            window.open(url, '_blank');
        });
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
                                    refreshApex(this.wiredRelatedItemsResult);
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

    handleSave() {
        const parentRecordId = this.bvCaseId;
    
        this.saveRecord(parentRecordId)
            .then(() => {
                if (this.fileName && this.fileData) {
                    return this.saveDocument(); // Only save document if file data exists
                } else if (this.originalDocumentId) {
                    // Update the SHDocument record with new metadata (even without file data)
                    return this.updateSHDocumentRecord();
                }
            })
            .then(() => {
                this.fileName = null;
                this.fileData = null; // Clear file data after saving
            })
            .catch(error => {
                console.log('Error saving record or uploading document', error);
                this.showToast('Error', 'Error saving record or uploading document: ' + error, 'error');
            });
    }

    updateSHDocumentRecord() {
        return new Promise((resolve, reject) => {
            const fields = {};
            fields[ID_FIELD.fieldApiName] = this.originalDocumentId; // Ensure you use the correct field for the record ID
            fields[DOCUMENT_TYPE_FIELD.fieldApiName] = this.documentType;
            fields[DOCUMENT_CORRESPONDENCE_WITH_FIELD.fieldApiName] = this.correspondenceWith;
            fields[DOCUMENT_DRAFT_FIELD.fieldApiName] = this.draft;
    
            updateRecord({ fields })
                .then(() => {
                    this.showToast('Success', 'Document metadata updated successfully', 'success');
                    refreshApex(this.wiredRelatedItemsResult);
                    this.closeSubModal();
                    resolve();
                })
                .catch(error => {
                    console.error('Error updating SHDocument record:', error);
                    this.showToast('Error', 'Error updating document metadata: ' + error.body.message, 'error');
                    reject(error);
                });
        });
    }

    saveDocument() {
        return new Promise((resolve, reject) => {
            if (!this.fileData) {
                resolve(); // If there's no file data, simply resolve and move on
                return;
            }
    
            const base64Data = this.fileData.split(',')[1]; // Extract Base64 content
            let folderName;
    
            getCaseName({ caseId: this.bvCaseId })
                .then((caseName) => {
                    folderName = `${caseName}/${this.record.Id}`;
                    return uploadFileToSharePoint({
                        filePath: folderName,
                        fileName: this.fileName,
                        fileContent: base64Data, // Pass the Base64 encoded content
                        documentType: this.documentType
                    });
                })
                .then((serverRelativeUrl) => {
                    this.serverRelativeURL = serverRelativeUrl;
                    this.showToast('Success', 'File uploaded successfully', 'success');
                    return this.createSHDocumentRecord(this.record.Id, folderName, serverRelativeUrl);
                })
                .then(() => {
                    refreshApex(this.wiredRelatedItemsResult);
                    this.closeSubModal();
                    resolve();
                })
                .catch(error => {
                    console.error('Error in saveDocument:', error);
                    reject(error);
                });
        });
    }

    createSHDocumentRecord(historyRecordId, folderName, documentId) {
        const shDocumentFields = {
            [SHDOCUMENT_NAME_FIELD.fieldApiName]: this.fileName,
            [DOCUMENT_EXTENSION_FIELD.fieldApiName]: this.fileName.split('.').pop(),
            [DOCUMENT_ID_FIELD.fieldApiName]: documentId,
            [DOCUMENT_TYPE_FIELD.fieldApiName]: this.documentType,
            [DOCUMENT_FILE_SIZE_FIELD.fieldApiName]: this.fileSize,
            [DOCUMENT_CORRESPONDENCE_WITH_FIELD.fieldApiName]: this.correspondenceWith,
            [DOCUMENT_DRAFT_FIELD.fieldApiName]: this.draft,
            [SERVER_RELATIVE_URL_FIELD.fieldApiName]: this.sharePointDirectoryPath + '/' + 'Shared%20Documents' + '/' + folderName + '/' + this.fileName,
            [CREATED_TIME_FIELD.fieldApiName]: new Date(),
            [CASE_HISTORY_FIELD.fieldApiName]: historyRecordId
        };

        const recordInput = { apiName: SHDOCUMENT_OBJECT.objectApiName, fields: shDocumentFields };
        createRecord(recordInput)
            .then((documentRecord) => {
                this.originalDocumentId = documentRecord.id;
                this.showToast('Success', 'SHDocument record created successfully', 'success');
                refreshApex(this.wiredRelatedItemsResult);
            })
            .catch(error => {
                console.log('Error creating SHDocument record', error);
                this.showToast('Error', 'Error creating SHDocument record', 'error');
            });
    }

    @api
    saveRecord(parentRecordId) {
        return new Promise((resolve, reject) => {
            if (!this.validateFields()) {
                this.showToast('Error', 'Please complete all required fields.', 'error');
                reject(new Error('Validation failed'));
                return;
            }

            const bvCaseIdString = parentRecordId ? String(parentRecordId) : null;

            let fields = {
                [DATE_INSERTED_FIELD.fieldApiName]: this.dateInserted,
                [ACTION_FIELD.fieldApiName]: this.description,
                [DETAILS_FIELD.fieldApiName]: this.details,
                [FLAG_IMPORTANT_FIELD.fieldApiName]: this.flagImportant,
                [CASE_OFFICER_FIELD.fieldApiName]: this.userId,
                [LAST_UPDATED_FIELD.fieldApiName]: new Date().toISOString()
            };

            if (this.record.Id) {
                fields[ID_FIELD.fieldApiName] = this.record.Id;

                updateRecord({ fields })
                    .then(() => {
                        if (!this.fileName) {
                            this.dispatchEvent(new CustomEvent('save'));
                        }
                        resolve(this.record.Id);
                    })
                    .catch(error => {
                        console.error('Error updating record:', error);
                        this.showToast('Error', 'Error updating record: ' + error.body.message, 'error');
                        reject(error);
                    });
            } else {
                if (bvCaseIdString) {
                    fields[BV_CASE_FIELD.fieldApiName] = bvCaseIdString;
                }

                createRecord({ apiName: CASE_HISTORY_OBJECT.objectApiName, fields })
                    .then(record => {
                        this.record = { ...this.record, Id: record.id };
                        if (!this.fileName) {
                            this.dispatchEvent(new CustomEvent('save'));
                        }
                        resolve(record.id);
                    })
                    .catch(error => {
                        console.error('Error creating record:', error);
                        this.showToast('Error', 'Error creating record: ' + error.body.message, 'error');
                        reject(error);
                    });
            }
        });
    }

    handleRowAction(event) {
        const actionName = event.detail.value;
        const relatedItemId = event.target.dataset.id;
    
        console.log('Action:', actionName, 'Related Item Id:', relatedItemId);
    
        if (actionName === 'viewEditFile') {
            this.handleViewEditFile(relatedItemId);
        } else if (actionName === 'viewEditDetails') {
            this.handleViewEditRelatedItem(relatedItemId);
        } else if (actionName === 'convertToPDF') {
            this.handleConvertToPDF(relatedItemId);
        } else if (actionName === 'delete') {
            this.handleDeleteRelatedItem(relatedItemId);
        }
    }
    
    handleViewEditFile(relatedItemId) {
        const selectedItem = this.relatedItems.find(item => item.Id === relatedItemId);
        if (selectedItem && selectedItem.ServerRelativeURL__c) {
            let serverRelativeURL = selectedItem.ServerRelativeURL__c;
    
            // Check if serverRelativeURL already contains a full URL (starts with http or https)
            let url = serverRelativeURL.startsWith('http') ? serverRelativeURL : `${this.sharePointSiteUrl}/${serverRelativeURL}`;
    
            console.log('serverRelativeURL', url);
            if (url) {
                window.open(url, '_blank');
            } else {
                this.showToast('Error', 'No URL found for this item.', 'error');
            }
        } else {
            this.showToast('Error', 'File URL not found.', 'error');
        }
    }

    handleConvertToPDF(relatedItemId) {
        const selectedItem = this.relatedItems.find(item => item.Id === relatedItemId);

        if (selectedItem) {
            this.contentDocumentId = selectedItem.DocumentID__c;
            this.isConvertToPDFModalOpen = true; // Open the modal with the PDF conversion component
        } else {
            this.showToast('Error', 'Document ID not found for this item.', 'error');
        }
    }

    closeConvertToPDFModal() {
        this.isConvertToPDFModalOpen = false;
    }

    handleDeleteRelatedItem(relatedItemId) {
        const selectedItem = this.relatedItems.find(item => item.Id === relatedItemId);
        if (selectedItem) {
            const serverRelativeURL = selectedItem.ServerRelativeURL__c;
            const fileName = selectedItem.Name;

            deleteSharepointFile({ filePath: serverRelativeURL, fileName })
                .then(() => {
                    deleteRecord(relatedItemId)
                        .then(() => {
                            this.showToast('Success', 'Document deleted successfully', 'success');
                            refreshApex(this.wiredRelatedItemsResult); // Refresh the list of related items
                        })
                        .catch(error => {
                            this.showToast('Error', 'Error deleting document record', 'error');
                        });
                })
                .catch(error => {
                    this.showToast('Error', 'Error deleting file from SharePoint', 'error');
                });
        }
    }

    handleViewEditRelatedItem(relatedItemId) {
        const selectedItem = this.relatedItems.find(item => item.Id === relatedItemId);
        if (selectedItem) {
            this.fileName = selectedItem.Name;
            this.fileSize = selectedItem.FileSize__c;
            this.documentType = selectedItem.DocumentType__c;
            this.correspondenceWith = selectedItem.Correspondence_With__c;
            this.draft = selectedItem.Draft__c;
            this.serverRelativeURL = selectedItem.ServerRelativeURL__c;

            this.isSubModalOpen = true; // Open the modal to view/edit the item
        }
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

    validateFields() {
        const allValid = [
            ...this.template.querySelectorAll('lightning-input'),
            ...this.template.querySelectorAll('lightning-textarea')
        ].reduce((validSoFar, inputCmp) => {
            inputCmp.reportValidity();
            return validSoFar && inputCmp.checkValidity();
        }, true);

        return allValid;
    }

    getTodayDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
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

    get emailStatusMessage() {
        switch(this.emailMessageStatus) {
            case '0':
                return 'New';
            case '1':
                return 'Read';
            case '2':
                return 'Replied';
            case '3':
                return 'Sent';
            case '4':
                return 'Forwarded';
            case '5':
                return 'Draft';
            default:
                return 'Unknown';
        }
    }
}
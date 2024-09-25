import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord, deleteRecord } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
import { getRecordId } from 'c/sharedService';
import CASE_HISTORY_OBJECT from '@salesforce/schema/Case_History__c';
import ID_FIELD from '@salesforce/schema/Case_History__c.Id';
import DATE_INSERTED_FIELD from '@salesforce/schema/Case_History__c.Date_Inserted_Time__c';
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
import DIRECT_URL_FIELD from '@salesforce/schema/SHDocument__c.DirectURL__c';
import CASE_HISTORY_FIELD from '@salesforce/schema/SHDocument__c.Case_History__c';
import CREATED_TIME_FIELD from '@salesforce/schema/SHDocument__c.Created_Time__c';
import downloadFileFromSharePoint from '@salesforce/apex/FileControllerGraph.downloadFileFromSharePoint';

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
    @track isParent = false;

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
                    { label: 'Delete', name: 'delete' },
                    { label: 'Download', name: 'download' }
                ]
            }
        }
    ];

    connectedCallback() {
        this.dateInserted = this.record.Date_Inserted_Time__c || this.getCurrentDateTime();
        this.description = this.record.Action__c || '';
        this.details = this.record.Details__c || '';
        this.flagImportant = this.record.Flag_as_important__c || false;
        this.bvCaseId = this.record.BV_Case__c || getRecordId();
        this.isParent = this.record.Case_History__r && this.record.Case_History__r.length > 0;

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
                FileSize__c: this.formatFileSize(doc.FileSize__c),
                formattedCreatedTime: this.formatDate(doc.Created_Time__c)
            }));
        } else if (result.error) {
            console.error('Error fetching related items:', result.error);
            this.showToast('Error', 'Error fetching related items', 'error');
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    handleInputChange(event) {
        const field = event.target.name;

        if (field === 'date-inserted') {
            // Convert the input value to full ISO 8601 format
            const inputDate = new Date(event.target.value);
            // Ensure the date is interpreted as UK time
            const ukDate = new Date(inputDate.toLocaleString("en-US", {timeZone: "Europe/London"}));
            this.dateInserted = ukDate.toISOString();
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
                                    return refreshApex(this.wiredRelatedItemsResult);
                                })
                                .then(() => {
                                    // After refreshing, re-fetch the data
                                    return getSHDocuments({ parentId: this.record.Id });
                                })
                                .then((freshData) => {
                                    this.relatedItems = freshData.map(doc => ({
                                        ...doc,
                                        FileSize__c: this.formatFileSize(doc.FileSize__c),
                                        formattedCreatedTime: this.formatDate(doc.Created_Time__c)
                                    }));
                                })
                                .catch(error => {
                                    console.log('Error deleting SHDocument record or refreshing data', error);
                                    this.showToast('Error', 'Error deleting SHDocument record or refreshing data', 'error');
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
                return refreshApex(this.wiredRelatedItemsResult);
            })
            .then(() => {
                // After refreshing, re-fetch the data
                return getSHDocuments({ parentId: this.record.Id });
            })
            .then((freshData) => {
                this.relatedItems = freshData.map(doc => ({
                    ...doc,
                    FileSize__c: this.formatFileSize(doc.FileSize__c),
                    formattedCreatedTime: this.formatDate(doc.Created_Time__c)
                }));
            })
            .catch(error => {
                console.log('Error saving record, uploading document, or refreshing data', error);
                this.showToast('Error', 'Error saving record, uploading document, or refreshing data: ' + error, 'error');
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
                    return refreshApex(this.wiredRelatedItemsResult);
                })
                .then(() => {
                    // After refreshing, re-fetch the data
                    return getSHDocuments({ parentId: this.record.Id });
                })
                .then((freshData) => {
                    this.relatedItems = freshData.map(doc => ({
                        ...doc,
                        FileSize__c: this.formatFileSize(doc.FileSize__c),
                        formattedCreatedTime: this.formatDate(doc.Created_Time__c)
                    }));
                    this.closeSubModal();
                    resolve();
                })
                .catch(error => {
                    console.error('Error updating SHDocument record or refreshing data:', error);
                    this.showToast('Error', 'Error updating document metadata or refreshing data: ' + error.body.message, 'error');
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
                .then((result) => {
                    this.serverRelativeURL = result.webUrl;
                    this.showToast('Success', 'File uploaded successfully', 'success');
                    return this.createSHDocumentRecord(this.record.Id, folderName, result.id, result.webUrl, result.directURL);
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

    createSHDocumentRecord(historyRecordId, folderName, documentId, webUrl, directURL) {
        const shDocumentFields = {
            [SHDOCUMENT_NAME_FIELD.fieldApiName]: this.fileName,
            [DOCUMENT_EXTENSION_FIELD.fieldApiName]: this.fileName.split('.').pop(),
            [DOCUMENT_ID_FIELD.fieldApiName]: documentId,
            [DOCUMENT_TYPE_FIELD.fieldApiName]: this.documentType,
            [DOCUMENT_FILE_SIZE_FIELD.fieldApiName]: this.fileSize,
            [DOCUMENT_CORRESPONDENCE_WITH_FIELD.fieldApiName]: this.correspondenceWith,
            [DOCUMENT_DRAFT_FIELD.fieldApiName]: this.draft,
            [SERVER_RELATIVE_URL_FIELD.fieldApiName]: webUrl,
            [DIRECT_URL_FIELD.fieldApiName]: directURL,
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
                            this.dispatchEvent(new CustomEvent('save', {
                                detail: { 
                                    recordId: this.record.Id,
                                    dateInserted: this.dateInserted,
                                    isParent: this.isParent
                                }
                            }));
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
    
        if (actionName === 'viewEditFile') {
            this.handleViewEditFile(relatedItemId);
        } else if (actionName === 'viewEditDetails') {
            this.handleViewEditRelatedItem(relatedItemId);
        } else if (actionName === 'convertToPDF') {
            this.handleConvertToPDF(relatedItemId);
        } else if (actionName === 'delete') {
            this.handleDeleteRelatedItem(relatedItemId);
        } else if (actionName === 'download') {
            this.handleDownloadFile(relatedItemId);
        }
    }
    
    handleViewEditFile(relatedItemId) {
        const selectedItem = this.relatedItems.find(item => item.Id === relatedItemId);
        if (selectedItem && selectedItem.ServerRelativeURL__c) {
            let serverRelativeURL = selectedItem.ServerRelativeURL__c;
    
            // Construct the full URL without double encoding
            let url = serverRelativeURL.startsWith('http') ? serverRelativeURL : `${this.sharePointSiteUrl}/${serverRelativeURL}`;

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
            let serverRelativeURL = selectedItem.DirectURL__c;
            let fileName = selectedItem.Name;

            // Strip away the unnecessary parts of the URL
            const urlParts = serverRelativeURL.split('/Shared%20Documents/');
            if (urlParts.length > 1) {
                serverRelativeURL = urlParts[1];
            }

            fileName = this.encodeFileName(fileName);
            console.log('serverRelativeURL', serverRelativeURL);

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

    doubleEncodeFileName(url) {
        // Split the URL by slashes to isolate the file name (last part)
        let parts = url.split('/');
        let fileName = parts.pop(); // Get the file name (last part of the URL)
    
        // Double encode only the file name and leave the rest of the URL intact
        fileName = encodeURIComponent(fileName)
        .replace(/%20/g, '%2520')
        .replace(/%23/g, '%2523')
        .replace(/%26/g, '%2526')
        .replace(/%3F/g, '%253F')
        .replace(/%25/g, '%2525')
        .replace(/%7B/g, '%257B')
        .replace(/%7D/g, '%257D')
        .replace(/%5E/g, '%255E')
        .replace(/%5B/g, '%255B')
        .replace(/%5D/g, '%255D') 
        .replace(/%60/g, '%2560')
        .replace(/%27/g, '%2527');

        // for some reason, the encodeURIComponent adds in an extra 25 FOR NO REASON - so get rid of that 25
        fileName = fileName.replace(/%2525([0-9A-F]{2})/g, '%25$1');
    
        // Rejoin the parts with the double-encoded file name
        return parts.join('/') + '/' + fileName;
    }

    encodeFileName(fileName) {
        // Encode the file name using encodeURIComponent to handle special characters
    
        // Double encode only the file name and leave the rest of the URL intact
        fileName = encodeURIComponent(fileName)
        .replace(/%20/g, '%2520')
        .replace(/%23/g, '%2523')
        .replace(/%26/g, '%2526')
        .replace(/%3F/g, '%253F')
        .replace(/%25/g, '%2525')
        .replace(/%7B/g, '%257B')
        .replace(/%7D/g, '%257D')
        .replace(/%5E/g, '%255E')
        .replace(/%5B/g, '%255B')
        .replace(/%5D/g, '%255D') 
        .replace(/%60/g, '%2560')
        .replace(/%27/g, '%2527');

        // for some reason, the encodeURIComponent adds in an extra 25 FOR NO REASON - so get rid of that 25
        fileName = fileName.replace(/%2525([0-9A-F]{2})/g, '%25$1');

        return fileName;
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

    getCurrentDateTime() {
        const now = new Date();
        const ukTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"}));
        return ukTime.toISOString(); // This will return the full ISO 8601 format
    }

    handleImport() {
        this.clearDocumentFields();
        this.isSubModalOpen = true;
    }

    handleViewEdit(relatedItemId) {
        // Check if relatedItemId exists before proceeding
        const selectedItem = this.relatedItems.find(item => item.Id === relatedItemId);
        if (selectedItem) {
            // Load document details if viewing/editing
            this.fileName = selectedItem.Name;
            this.fileSize = selectedItem.FileSize__c;
            this.documentType = selectedItem.DocumentType__c;
            this.correspondenceWith = selectedItem.Correspondence_With__c;
            this.draft = selectedItem.Draft__c;
            this.serverRelativeURL = selectedItem.ServerRelativeURL__c;
            this.originalDocumentId = selectedItem.Id;
        } else {
            this.clearDocumentFields(); // Clear fields if creating a new document
        }
    
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

    clearDocumentFields() {
        this.fileName = null;
        this.fileData = null;
        this.fileSize = null;
        this.documentType = null;
        this.correspondenceWith = null;
        this.draft = null;
        this.serverRelativeURL = null;
        this.originalDocumentId = null;
    }

    handleDownloadFile(relatedItemId) {
        const selectedItem = this.relatedItems.find(item => item.Id === relatedItemId);
        if (selectedItem && selectedItem.DirectURL__c) {
            let serverRelativeURL = selectedItem.DirectURL__c;
            let fileName = selectedItem.Name;

            // Strip away the unnecessary parts of the URL
            const urlParts = serverRelativeURL.split('/Shared%20Documents/');
            if (urlParts.length > 1) {
                serverRelativeURL = urlParts[1];
            }

            downloadFileFromSharePoint({ filePath: serverRelativeURL })
                .then(result => {
                    const element = document.createElement('a');
                    element.href = 'data:application/octet-stream;base64,' + result.fileContent;
                    element.download = result.fileName;
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                })
                .catch(error => {
                    console.error('Error downloading file:', error);
                    this.showToast('Error', 'Error downloading file', 'error');
                });
        } else {
            this.showToast('Error', 'File URL not found.', 'error');
        }
    }
}
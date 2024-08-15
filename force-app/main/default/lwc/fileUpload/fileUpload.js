import { LightningElement, track, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import LightningConfirm from 'lightning/confirm';
import { fireEvent } from 'c/pubsub';
import getSharePointSettings from '@salesforce/apex/FileControllerGraph.getSharePointSettings';
import uploadFileToSharePointCaseCreation from '@salesforce/apex/FileControllerGraph.uploadFileToSharePointCaseCreation';
import processFiles from '@salesforce/apex/FileControllerGraph.processFiles';
import fetchFilesFromSharePoint from '@salesforce/apex/FileControllerGraph.fetchFilesFromSharePoint';
import deleteSharepointFile from '@salesforce/apex/FileControllerGraph.deleteFileFromSharePoint';
import { createRecord } from 'lightning/uiRecordApi';

export default class FileUpload extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;
    @api title = "File Upload"; // Default component title
    @api helpText = "Upload files to attach them to this case."; // Default help text
    @api fileType = 'BV1A'; // Default file type
    @api maxFiles = 0; // Default to unlimited
    @api fileExtensionType = ''; // Keeps track of the file extension type
    @api fileExtensionsWhitelist = ''; // CSV string for valid file extensions, e.g., 'jpg,png,gif'
    @api fileGridSize = '1-of-6'; // Default to 6 columns
    @track files = [];
    @track sharePointSiteUrl;
    @track sharePointDirectoryPath;
    @track caseHistoryId;
    wiredFilesResult;
    wiredSettingsResult;
    fileToDelete = null;

    @wire(CurrentPageReference) pageRef;
    @wire(getRecord, { recordId: '$recordId', fields: ['BV_Case__c.Name'] })
    record;

    // Wire the method for SharePoint settings
    @wire(getSharePointSettings)
    wiredGetSharePointSettings(result) {
        this.wiredSettingsResult = result;

        if (result.data) {
            const settings = result.data;
            this.sharePointSiteUrl = settings.SharePoint_Site_URL;
            this.sharePointDirectoryPath = settings.SharePoint_Directory_Path;
            refreshApex(this.wiredFilesResult); // Refresh files data once settings are fetched
        } else if (result.error) {
            console.error('Error fetching SharePoint settings:', result.error);
        }
    }

    // Wire the method to fetch files from SharePoint
    @wire(fetchFilesFromSharePoint, { folderPath: '$bvCaseName', documentType: '$fileType' })
    wiredFetchFiles(result) {
        this.wiredFilesResult = result;

        if (result.data) {
            this.files = result.data.map(document => {
                let fileExtensionType = 'unknown';
                const extension = document.name.split('.').pop().toLowerCase();

                switch (extension) {
                    case 'pdf':
                        fileExtensionType = 'pdf';
                        break;
                    case 'doc':
                    case 'docx':
                        fileExtensionType = 'word';
                        break;
                    case 'jpg':
                    case 'jpeg':
                    case 'png':
                    case 'gif':
                        fileExtensionType = 'image';
                        break;
                    case 'xls':
                    case 'xlsx':
                    case 'csv':
                        fileExtensionType = 'excel';
                        break;
                    default:
                        fileExtensionType = 'unknown';
                        break;
                }

                return {
                    Title: document.name,
                    Id: document.id,
                    ServerRelativeUrl: document.webUrl,
                    fileExtensionType: fileExtensionType,
                    isPdf: fileExtensionType === 'pdf',
                    isWord: fileExtensionType === 'word',
                    isImage: fileExtensionType === 'image',
                    isExcel: fileExtensionType === 'excel',
                    isUnknown: fileExtensionType === 'unknown',
                    previewPath: document.thumbnailUrl,
                };
            });
        } else if (result.error) {
            console.error("Error fetching sharepoint files", result.error);
        }
    }

    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;

        if (this.maxFiles > 0 && (this.files.length + uploadedFiles.length) > this.maxFiles) {
            console.error(`Cannot upload. The maximum number of files (${this.maxFiles}) would be exceeded.`);
            return;
        }

        const allowedExtensions = this.fileExtensionsWhitelist
            ? this.fileExtensionsWhitelist.split(',').map(ext => ext.trim().toLowerCase())
            : null;

        for (let file of uploadedFiles) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (allowedExtensions && !allowedExtensions.includes(fileExtension)) {
                console.error(`File extension "${fileExtension}" not allowed. Upload cancelled.`);
                return;
            }
        }

        const documentIds = uploadedFiles.map(file => file.documentId);

        processFiles({ documentIds })
            .then(base64DataArray => {
                base64DataArray.forEach((base64Data, index) => {
                    const file = uploadedFiles[index];
                    const binaryData = window.atob(base64Data);

                    // Proceed with uploading the file to SharePoint
                    this.uploadFileToSharePoint(file.name, base64Data);
                });
            })
            .catch(error => {
                console.error('Error processing files:', error);
            });
    }

    uploadFileToSharePoint(fileName, binaryData) {
        return uploadFileToSharePointCaseCreation({
            filePath: this.bvCaseName,
            fileName: fileName,
            fileContent: binaryData,
            documentType: this.fileType
        })
        .then(result => {
            const listItemInfo = JSON.parse(result);

            console.log('File uploaded and processed:', listItemInfo);

            // If no Case History exists, create one first
            if (!this.caseHistoryId) {
                return this.createCaseHistory().then((caseHistoryId) => {
                    this.caseHistoryId = caseHistoryId;
                    return this.saveSHDocumentRecord(this.caseHistoryId, listItemInfo);
                });
            } else {
                // Case History exists, save SHDocument directly
                return this.saveSHDocumentRecord(this.caseHistoryId, listItemInfo);
            }
        })
        .then(() => {
            // Refresh the file list or other UI components
            return refreshApex(this.wiredFilesResult);
        })
        .catch(error => {
            console.error('Error during file upload and processing:', error);
        });
    }

    saveSHDocumentRecord(caseHistoryId, listItemInfo) {
        const fields = {
            Case_History__c: caseHistoryId,
            DocumentID__c: listItemInfo.listItemId,
            ServerRelativeURL__c: listItemInfo.webUrl,
            Document_Name__c: listItemInfo.fileName,
            FileSize__c: listItemInfo.fileSize,
            DocumentExtension__c: listItemInfo.fileExtension,
            DocumentType__c: this.fileType,
            Name: listItemInfo.fileName
        };

        const recordInput = { apiName: 'SHDocument__c', fields };

        return createRecord(recordInput)
            .then((record) => {
                console.log('SHDocument__c record created:', record.id);
                return record.id;
            })
            .catch(error => {
                console.error('Error creating SHDocument__c record:', error);
                throw error;
            });
    }

    createCaseHistory() {
        const fields = {
            BV_Case__c: this.recordId,
            Action__c: 'Case Creation Document',
            Date_Inserted__c: new Date(),
            Last_updated__c: new Date()
        };

        const recordInput = { apiName: 'Case_History__c', fields };

        return createRecord(recordInput)
            .then((caseHistory) => {
                console.log('Case_History__c record created:', caseHistory.id);
                return caseHistory.id;
            })
            .catch(error => {
                console.error('Error creating Case_History__c record:', error);
                throw error;
            });
    }

    handleMenuAction(event) {
        const actionName = event.detail.value;
        const fileId = event.target.dataset.id;
        const doc = this.files.find(d => d.Title === fileId);

        switch(actionName) {
            case 'view':
                const previewPageUrl = doc.ServerRelativeUrl;
                window.open(previewPageUrl, '_blank');
                break;
            case 'delete':
                this.handleDeleteFile(fileId);
                break;
            default:
                console.warn(`Unexpected action: ${actionName}`);
                break;
        }
    }

    handleDeleteFile(fileId) {
        this.fileToDelete = fileId;
        LightningConfirm.open({
            message: 'Are you sure you want to delete this file?',
            theme: 'warning',
            label: 'Confirm file deletion'
        }).then(result => {
            if(result) {
                this.confirmSharepointDeleteFile();
            }
        });
    }

    confirmSharepointDeleteFile() {
        if (this.fileToDelete) {
            deleteSharepointFile({ filePath: this.bvCaseName, fileName: this.fileToDelete })
            .then(() => {
                return refreshApex(this.wiredFilesResult); // Refresh the file list
            })
            .catch(error => {
                console.error("Error deleting file", error);
            })
            .finally(() => {
                this.fileToDelete = null;
            });
        }
    }

    handlePreview() {
        const fileId = event.target.dataset.id;
        const doc = this.files.find(d => d.Title === fileId);
        
        const previewPageUrl = doc.ServerRelativeUrl;

        window.open(previewPageUrl, '_blank');
    }

    get hasReachedMaxFiles() {
        if (this.maxFiles <= 0) {
            // No limit specified
            return false;
        }
        return this.files.length >= this.maxFiles;
    }

    get fileClass() {
        return `slds-file slds-file_card slds-has-title slds-col slds-size_${this.fileGridSize} slds-m-right_x-small slds-m-bottom_x-small`;
    }

    get bvCaseName() {
        let caseName = getFieldValue(this.record.data, 'BV_Case__c.Name');
        if (caseName) {
            return caseName.replace(/\//g, '_');
        } else {
            return '';
        }
    }
}
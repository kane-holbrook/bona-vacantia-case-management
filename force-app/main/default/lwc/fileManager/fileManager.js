import { LightningElement, track, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import LightningConfirm from 'lightning/confirm';
import { fireEvent } from 'c/pubsub';
import getSharePointSettings from '@salesforce/apex/FileControllerGraph.getSharePointSettings';
import uploadFileToSharePoint from '@salesforce/apex/FileControllerGraph.uploadFileToSharePoint';
import processFiles from '@salesforce/apex/FileControllerGraph.processFiles';
import fetchFilesFromSharePoint from '@salesforce/apex/FileControllerGraph.fetchFilesFromSharePoint';
import deleteSharepointFile from '@salesforce/apex/FileControllerGraph.deleteFileFromSharePoint';

export default class FileManager extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;
    @api title = "File Manager"; // Default component title
    @api helpText = "Upload files to attach them to this case."; // Default help text
    @api fileType = 'BV1A'; // Default file type
    @api maxFiles = 0; // Default to unlimited
    @api fileExtensionType = ''; // Keeps track of the file extension type
    @api fileExtensionsWhitelist = ''; // CSV string for valid file extensions, e.g., 'jpg,png,gif'
    @api fileGridSize = '1-of-6'; // Default to 6 columns
    @track files = [];
    @track sharePointSiteUrl;
    @track sharePointDirectoryPath;
    fileToDelete = null;

    @wire(CurrentPageReference) pageRef;
    @wire(getRecord, { recordId: '$recordId', fields: ['BV_Case__c.Name'] })
    record;

    connectedCallback() {
        setTimeout(() => {
            this.fetchSharePointSettings();
        }, 0);
    }

    fetchSharePointSettings() {
        getSharePointSettings()
            .then(settings => {
                this.sharePointSiteUrl = settings.SharePoint_Site_URL;
                this.sharePointDirectoryPath = settings.SharePoint_Directory_Path;
                this.fetchFilesSharepoint();
            })
            .catch(error => {
                console.error('Error fetching SharePoint settings:', error);
            });
    }

    fetchFilesSharepoint() {
        fetchFilesFromSharePoint({ folderPath: this.bvCaseName, documentType: this.fileType })
            .then(result => {
                this.files = result.map(document => {

                    console.log('Files from sharepoint:', result);
                    let fileExtensionType = 'unknown';
                    // Extract file extension from document.Name
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
                        // Create an object structure similar to the original one
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
            })
            .catch(error => {
                console.error("Error fetching sharepoint files", error);
            });
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
                    // Decode the base64 encoeded data
                    const binaryData = window.atob(base64Data);

                    uploadFileToSharePoint({
                        filePath: this.bvCaseName,
                        fileName: file.name,
                        fileContent: binaryData,
                        documentType: this.fileType
                    })
                    .then(result => {
                        console.log('File uploaded to SharePoint:', result);
                    })
                    .catch(error => {
                        console.error('Error uploading file to SharePoint:', error);
                    });
                });
            })
            .catch(error => {
                console.error('Error processing files:', error);
            });
    }
    
    // Helper method to read file as base64
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]); // Split to get base64 content
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    handleMenuAction(event) {
        const actionName = event.detail.value;
        const fileId = event.target.dataset.id;
        const doc = this.files.find(d => d.Title === fileId);

        console.log('doc', doc);
        console.log('fileId', fileId);
        
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
                window.location.reload();
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
        // Replace all occurrences of '/' with '_'

        if (caseName) {
            return caseName.replace(/\//g, '_');
        } else {
            return '';
        }
    }
}
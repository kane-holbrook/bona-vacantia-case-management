import { LightningElement, track, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import LightningConfirm from 'lightning/confirm';
import { fireEvent } from 'c/pubsub';
import getFiles from '@salesforce/apex/FileController.getFiles';
import deleteFile from '@salesforce/apex/FileController.deleteFile';
import deleteSharepointFile from '@salesforce/apex/FileController.deleteSharepointFile';
import uploadFileToSharePoint from '@salesforce/apex/FileController.uploadFileToSharePoint';
import associateFileWithCase from '@salesforce/apex/FileController.associateFileWithCase';
import fetchDocumentsByType from '@salesforce/apex/FileController.fetchDocumentsByType';
import getSharePointFileDataById from '@salesforce/apex/PDFTron_ContentVersionController.getSharePointFileDataById';
import getMappedTemplateData from '@salesforce/apex/PDFTron_ContentVersionController.getMappedTemplateData';
import processFiles from '@salesforce/apex/FileController.processFiles';

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
    fileToDelete = null;

    @wire(CurrentPageReference) pageRef;
    @wire(getRecord, { recordId: '$recordId', fields: ['BV_Case__c.Name'] })
    record;

    connectedCallback() {
        setTimeout(() => {
            this.fetchFilesSharepoint();
        }, 0);
    }

    fetchFiles() {
        getFiles({ fileType: this.fileType, caseId: this.recordId })
        .then(result => {
            this.files = result.map(file => {
                let fileExtensionType = 'unknown';
                
                // Using the FileExtension property to determine the file extension.
                const extension = file.FileExtension ? file.FileExtension.toLowerCase() : 'unknown';
    
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
                    ...file,
                    fileExtensionType: fileExtensionType,
                    isPdf: fileExtensionType === 'pdf',
                    isWord: fileExtensionType === 'word',
                    isImage: fileExtensionType === 'image',
                    isExcel: fileExtensionType === 'excel',
                    isUnknown: fileExtensionType === 'unknown',
                    previewPath: `/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB720BY480&versionId=${file.Id}`
                };
            });
        })
        .catch(error => {
            console.error("Error fetching files", error);
        });
    }

    fetchFilesSharepoint() {
        fetchDocumentsByType({ documentType: this.fileType, caseId: this.bvCaseName })
            .then(result => {
                console.log('result', result)
                this.files = result.map(document => {

                    console.log('document', document)

                    let fileExtensionType = 'unknown';
                    // Extract file extension from document.Name
                    const extension = document.Name.split('.').pop().toLowerCase();
        
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
                        Title: document.Name,
                        Id: document.Keywords,
                        ServerRelativeUrl: document.Url,
                        fileExtensionType: fileExtensionType,
                        isPdf: fileExtensionType === 'pdf',
                        isWord: fileExtensionType === 'word',
                        isImage: fileExtensionType === 'image',
                        isExcel: fileExtensionType === 'excel',
                        isUnknown: fileExtensionType === 'unknown',
                        previewPath: `https://glduat.sharepoint.com/sites/XansiumUATTestSite/_layouts/15/getpreview.ashx?path=${encodeURIComponent(document.Url)}`
                    };
                });
            })
            .catch(error => {
                console.error("Error fetching sharepoint files", error);
            });
    }

    handleMenuAction(event) {
        const actionName = event.detail.value;
        const fileId = event.target.dataset.id;
        const doc = this.files.find(d => d.Title === fileId);
        
        switch(actionName) {
            case 'view':
                const sharePointDomain = 'https://glduat.sharepoint.com';
                const siteName = 'sites/XansiumUATTestSite';
                const parentFolderPath = encodeURIComponent(`123`); // Required for some reason
        
                const previewPageUrl = `${sharePointDomain}/${siteName}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(doc.ServerRelativeUrl)}&parent=${parentFolderPath}`;
        
                window.open(previewPageUrl, '_blank');
                break;
            case 'delete':
                this.handleDeleteFile(fileId);
                break;
            case 'generate':
                getSharePointFileDataById({ fileId: doc.Id })
                    .then(result => {
                        console.log('data by id result', result);

                        fireEvent(this.pageRef, 'blobSelected', result);
                    })
                    .catch(error => {
                        console.log("Error fetching file data", error);
                    }
                );

                console.log('doc', doc);

                setTimeout(() => {
                    getMappedTemplateData({ templateName: doc.Title, recordId: this.recordId })
                        .then(result => {

                            console.log('template mapping result', result);
                            fireEvent(this.pageRef, 'bulk_mapping', result);
                        })
                        .catch(error => {
                            console.log("Error fetching template mapping results", error);
                        }
                    );
                }, 5000);
                break;
            default:
                // Handle or log an unexpected action
                console.warn(`Unexpected action: ${actionName}`);
                break;
        }
    }

    _base64ToArrayBuffer(base64) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
          bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    async handleDeleteFile(fileId) {
        this.fileToDelete = fileId;
        const result = await LightningConfirm.open({
            message: 'Are you sure you want to delete this file?',
            theme: 'warning',
            label: 'Confirm file deletion'
        });
    
        if(result) {
            this.confirmSharepointDeleteFile();
        }
    }

    handleDialogClose() {
        this.fileToDelete = null;
    }

    confirmDeleteFile() {
        if (this.fileToDelete) {
            deleteFile({ contentDocumentId: this.fileToDelete })
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

    confirmSharepointDeleteFile() {
        if (this.fileToDelete) {
            deleteSharepointFile({ caseId: this.bvCaseName, fileName: this.fileToDelete })
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

    handleUploadNewVersion(fileId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state: {
                selectedRecordId: fileId,
                selectedRelatedRecordId: this.recordId
            }
        });
    }

    handleViewHistory(fileId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/lightning/r/ContentDocument/${fileId}/related/ContentVersions/view`
            }
        });
    }

    handleUploadFinished(event) {
        // Get the list of uploaded files
        const uploadedFiles = event.detail.files;
    
        // Check if the number of files after upload would exceed the maxFiles limit
        if (this.maxFiles > 0 && (this.files.length + uploadedFiles.length) > this.maxFiles) {
            console.error(`Cannot upload. The maximum number of files (${this.maxFiles}) would be exceeded.`);
            return;
        }
    
        // Parse the whitelist CSV into an array for easy checking
        const allowedExtensions = this.fileExtensionsWhitelist
            ? this.fileExtensionsWhitelist.split(',').map(ext => ext.trim().toLowerCase())
            : null;
    
        // Check each uploaded file's extension against the whitelist (if provided)
        for (let file of uploadedFiles) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
    
            // If a whitelist is provided, check if the extension is allowed; otherwise, allow all extensions
            if (allowedExtensions && !allowedExtensions.includes(fileExtension)) {
                console.error(`File extension "${fileExtension}" not allowed. Upload cancelled.`);
                return;
            }
        }
    
        // Extract documentIds from uploaded files
        const documentIds = uploadedFiles.map(file => file.documentId);

        // Call the Apex method to process files
        processFiles({ documentIds })
            .then(base64DataArray => {
                // Create a promise array to handle the upload process
                let uploadPromises = [];

                base64DataArray.forEach((base64Data, index) => {
                    let fileName = uploadedFiles[index].name;

                    // Add the SharePoint upload process to the promises array
                    uploadPromises.push(
                        uploadFileToSharePoint({
                            folderName: '/'+ this.bvCaseName,
                            fileName: fileName,
                            base64Data: base64Data,
                            documentType: this.fileType
                        }).then(result => {
                            console.log('File uploaded to SharePoint:', result);

                            // Additional actions after successful upload to SharePoint
                            let contentDocumentId = uploadedFiles[index].documentId;
                            return associateFileWithCase({ caseId: this.recordId, docId: contentDocumentId, fileType: this.fileType });
                        }).catch(error => {
                            console.error('Error uploading file to SharePoint:', error);
                        })
                    );
                });

                return Promise.all(uploadPromises);
            })
            .then(() => {
                console.log('All files processed successfully');
                window.location.reload();
            })
            .catch(error => {
                console.error('Error processing files:', error);
        });
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]); // Split to get base64 content
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    fetchFileBlobs(documentIds) {
        return processFiles({ documentIds })
            .then(results => {
                // Convert each base64 string in results to Blob
                return results.map(base64Data => {
                    let binaryString = window.atob(base64Data);
                    let len = binaryString.length;
                    let bytes = new Uint8Array(len);

                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    return new Blob([bytes], { type: 'application/octet-stream' });
                });
            })
            .catch(error => {
                console.error('Error fetching file blobs:', error);
                throw error; // Re-throw the error to be handled by the caller
            });
    }

    handlePreview(event) {
        const fileId = event.target.dataset.id;
        const doc = this.files.find(d => d.Title === fileId);
        const sharePointDomain = 'https://glduat.sharepoint.com';
        const siteName = 'sites/XansiumUATTestSite';
        const parentFolderPath = encodeURIComponent(`123`); // Required for some reason

        const previewPageUrl = `${sharePointDomain}/${siteName}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(doc.ServerRelativeUrl)}&parent=${parentFolderPath}`;

        window.open(previewPageUrl, '_blank');
    }

    handleFileDownload(event) {
        const documentId = event.currentTarget.dataset.id;
    
        // Logic to download the file. This sets the browser location to the Salesforce URL for the file.
        window.location.href = `/sfc/servlet.shepherd/document/download/${documentId}`; // Salesforce's standard URL pattern for downloading files
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
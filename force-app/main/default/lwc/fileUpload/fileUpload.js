import { LightningElement, track, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import LightningConfirm from 'lightning/confirm';
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
    fileToDelete = null;
    wiredFiles;
    wiredSettings;

    @wire(CurrentPageReference) pageRef;
    @wire(getRecord, { recordId: '$recordId', fields: ['BV_Case__c.Name'] })
    record;

    @wire(getSharePointSettings)
    wiredGetSharePointSettings({ error, data }) {
        this.wiredSettings = data;
        if (data) {
            this.sharePointSiteUrl = data.SharePoint_Site_URL;
            this.sharePointDirectoryPath = data.SharePoint_Directory_Path;
            this.refreshFiles(); // Ensure files are refreshed after settings are fetched
        } else if (error) {
            console.error('Error fetching SharePoint settings:', error);
        }
    }

    @wire(fetchFilesFromSharePoint, { folderPath: '$bvCaseName', documentType: '$fileType' })
    wiredFetchFiles(result) {
        this.wiredFiles = result;
        if (result.data) {
            this.files = this.processDocuments(result.data);
        } else if (result.error) {
            console.error("Error fetching SharePoint files", result.error);
        }
    }

    processDocuments(documents) {
        return documents.map(document => {
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
    }

    refreshFiles() {
        refreshApex(this.wiredFiles); // Ensures files are refreshed whenever required
    }

    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
    
        // Check if the maximum number of files is exceeded
        if (this.maxFiles > 0 && (this.files.length + uploadedFiles.length) > this.maxFiles) {
            console.error(`Cannot upload. The maximum number of files (${this.maxFiles}) would be exceeded.`);
            return;
        }
    
        // Validate the file extension if whitelist is provided
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
    
        // If the caseHistoryId is already set, use the existing record for further uploads
        const caseHistoryPromise = this.caseHistoryId
            ? Promise.resolve(this.caseHistoryId)
            : this.createCaseHistory();
    
        caseHistoryPromise
            .then(caseHistoryId => {
                // Store the Case History ID (if it's newly created, it will be assigned here)
                this.caseHistoryId = caseHistoryId;
    
                // Prepare the folder path using bvcaseid/historyrecordid format
                const folderPath = `${this.bvCaseName}/${this.caseHistoryId}`;
    
                // Process and upload the files
                const documentIds = uploadedFiles.map(file => file.documentId);
    
                // Convert and upload files to SharePoint using the created history folder
                return processFiles({ documentIds })
                    .then(base64DataArray => {
                        return Promise.all(base64DataArray.map((base64Data, index) => {
                            const file = uploadedFiles[index];
                            return uploadFileToSharePointCaseCreation({
                                filePath: folderPath,  // Use the folder path including historyRecordId
                                fileName: file.name,
                                fileContent: base64Data,
                                documentType: this.fileType
                            });
                        }));
                    });
            })
            .then(responses => {
                // Handle the uploaded files and save SHDocument records with the existing or new caseHistoryId
                responses.forEach(response => {
                    const newFile = {
                        Title: response.fileName,
                        Id: response.documentId,
                        ServerRelativeUrl: response.webUrl,
                        fileExtensionType: response.fileExtension.toLowerCase(),
                        previewPath: response.webUrl
                    };
                    this.files.push(newFile);
                });
    
                // Save SHDocument records using the existing or newly created caseHistoryId
                return this.createHistoryAndSHDocument(responses);
            })
            .then(() => {
                return refreshApex(this.wiredFiles);  // Refresh the files after upload
            })
            .catch(error => {
                console.error('Error during file processing, uploading, or post-upload actions:', error);
            });
    }
    
    createHistoryAndSHDocument(uploadResponses) {
        // Use the existing caseHistoryId to create SHDocument records
        const createRecords = uploadResponses.map(response => {
            return this.saveSHDocumentRecord(this.caseHistoryId, response); // Pass the already created caseHistoryId
        });
    
        return Promise.all(createRecords);
    }
    
    saveSHDocumentRecord(caseHistoryId, uploadResponse) {
        console.log('uploadResponse', uploadResponse);
    
        // Extract necessary fields from uploadResponse for SHDocument__c creation
        const fields = {
            Case_History__c: caseHistoryId,
            DocumentID__c: uploadResponse.documentId, // From uploadFileToSharePointCaseCreation response
            ServerRelativeURL__c: uploadResponse.webUrl, // From uploadFileToSharePointCaseCreation response
            Document_Name__c: uploadResponse.fileName, // From uploadFileToSharePointCaseCreation response
            FileSize__c: uploadResponse.fileSize, // Assuming fileSize comes from the response
            DocumentExtension__c: uploadResponse.fileExtension.toLowerCase(), // From response
            DocumentType__c: this.fileType,
            Name: uploadResponse.fileName // From the response
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
            const folderPath = `${this.bvCaseName}/${this.caseHistoryId}`; // Use caseHistoryId in the path
            deleteSharepointFile({ filePath: folderPath, fileName: this.fileToDelete })
                .then(() => {
                    this.files = this.files.filter(file => file.Title !== this.fileToDelete);
    
                    if (this.files.length === 0) {
                        this.deleteCaseHistory().then(() => {
                            console.log('Case history deleted as all files have been deleted.');
                        }).catch(error => {
                            console.error('Error deleting case history:', error);
                        });
                    }
    
                    this.refreshFiles();  // Refresh the files after deletion
                })
                .catch(error => {
                    console.error("Error deleting file", error);
                })
                .finally(() => {
                    this.fileToDelete = null;
                });
        }
    }
    
    
    deleteCaseHistory() {
        // Call your Apex method to delete the Case History record using the caseHistoryId
        return deleteRecord({ recordId: this.caseHistoryId })
            .then(() => {
                console.log('Case_History__c record deleted successfully');
                this.caseHistoryId = null; // Clear the caseHistoryId after deletion
            })
            .catch(error => {
                console.error('Error deleting Case_History__c record:', error);
                throw error;
            });
    }

    handlePreview() {
        const fileId = event.target.dataset.id;
        const doc = this.files.find(d => d.Title === fileId);
        
        const previewPageUrl = doc.ServerRelativeUrl;

        window.open(previewPageUrl, '_blank');
    }

    get hasReachedMaxFiles() {
        return this.maxFiles > 0 && this.files.length >= this.maxFiles;
    }

    get fileClass() {
        return `slds-file slds-file_card slds-has-title slds-col slds-size_${this.fileGridSize} slds-m-right_x-small slds-m-bottom_x-small`;
    }

    get bvCaseName() {
        let caseName = getFieldValue(this.record.data, 'BV_Case__c.Name');
        return caseName ? caseName.replace(/\//g, '_') : '';
    }
}
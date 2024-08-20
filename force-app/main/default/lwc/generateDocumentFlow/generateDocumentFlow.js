import { LightningElement, api, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import fetchAllFilesFromFolder from '@salesforce/apex/FileControllerGraph.fetchAllFilesFromFolder';
import getSharePointSettings from '@salesforce/apex/FileControllerGraph.getSharePointSettings';
import { getRecordId } from 'c/sharedService';

export default class GenerateDocumentFlow extends LightningElement {
    @api recordId;
    @api caseId;
    @track documents;
    @track documentCategories = [];
    @track filteredDocuments = [];
    @api selectedDocumentId;
    @api selectedDocumentType;
    @api availableActions = [];
    
    @track sharePointSiteUrl;
    @track sharePointDirectoryPath;

    isLoading = false;
    isCategorySelected = false;
    selectedCategory = '';

    connectedCallback() {
        this.caseId = getRecordId();
        this.fetchSharePointSettings();

        // Automatically proceed if document ID and type are already provided
        if (this.selectedDocumentId && this.selectedDocumentType) {
            this.autoNavigateToNextStep();
        }
    }

    @wire(CurrentPageReference) pageRef;

    fetchSharePointSettings() {
        this.isLoading = true;
        getSharePointSettings()
            .then(settings => {
                this.sharePointSiteUrl = settings.SharePoint_Site_URL;
                this.sharePointDirectoryPath = settings.SharePoint_Directory_Path;
                this.fetchDocuments();
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error fetching SharePoint settings:', error);
            });
    }

    fetchDocuments() {
        if (!this.sharePointSiteUrl || !this.sharePointDirectoryPath) return;
        const parentFolderPath = encodeURIComponent(this.sharePointDirectoryPath);

        fetchAllFilesFromFolder({ folderPath: 'Templates' })
            .then(result => {
                console.log('Files from sharepoint:', result);
                // Construct the SharePoint preview URL
                this.documents = result.map(doc => {
                    let previewUrl = `${this.sharePointSiteUrl}/${this.sharePointDirectoryPath}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(doc.webUrl)}&parent=${parentFolderPath}`;
                    // Determine the display name
                    let displayName = doc.listItem.fields.Document_x0020_Name ? doc.listItem.fields.Document_x0020_Name : doc.name;
                    return { 
                        ...doc, 
                        id: doc.id,
                        previewUrl, 
                        displayName,
                        DocumentType: doc.listItem.fields.DocumentType,
                        DocumentCategory: doc.listItem.fields.Document_x0020_Category,
                        Created_Time: doc.listItem.fields.Created,
                        ServerRelativeURL__c: doc.webUrl
                    };
                });

                // Group documents by categories
                this.groupDocumentsByCategory();
                this.isLoading = false;
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error fetching documents:', error);
            });
    }

    groupDocumentsByCategory() {
        let categories = {};
        this.documents.forEach(doc => {
            let category = doc.DocumentCategory || 'Uncategorized';
            if (!categories[category]) {
                categories[category] = {
                    name: category,
                    documents: []
                };
            }
            categories[category].documents.push(doc);
        });
        this.documentCategories = Object.values(categories);
    }

    handleCategorySelection(event) {
        const category = event.target.dataset.category;
        this.selectedCategory = category;
        this.filteredDocuments = this.documentCategories.find(cat => cat.name === category).documents;
        this.isCategorySelected = true;
    }

    handleBackToCategories() {
        this.isCategorySelected = false;
        this.selectedCategory = '';
        this.filteredDocuments = [];
    }

    handleSelectionChange(event) {
        this.selectedDocumentId = event.target.dataset.id;
        const selectedDocument = this.documents.find(doc => doc.id === this.selectedDocumentId);
        if (selectedDocument) {
            this.selectedDocumentType = selectedDocument.DocumentType;
        }
    }

    handleNextDocumentSelection() {
        if (this.selectedDocumentId) {
            // If the next action is available, navigate to the next screen
            if (this.availableActions.includes('NEXT')) {
                const navigateNextEvent = new FlowNavigationNextEvent();
                this.dispatchEvent(navigateNextEvent);
            }
        } else {
            alert('Please select a document.');
        }
    }

    autoNavigateToNextStep() {
        // Check if the "NEXT" action is available and trigger it
        if (this.availableActions.includes('NEXT')) {
            const navigateNextEvent = new FlowNavigationNextEvent();
            this.dispatchEvent(navigateNextEvent);
        }
    }
}
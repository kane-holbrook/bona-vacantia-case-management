import { LightningElement, api, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import fetchTemplates from '@salesforce/apex/FileController.fetchTemplates';

export default class GenerateDocumentFlow extends LightningElement {
    @api recordId;
    @api caseId;
    @track documents;
    @track documentCategories = [];
    @track filteredDocuments = [];
    @api selectedDocumentId;
    @api selectedDocumentType;
    @api availableActions = [];

    isLoading = false;
    isCategorySelected = false;
    selectedCategory = '';

    connectedCallback() {
        this.fetchDocuments();
    }

    @wire(CurrentPageReference) pageRef;

    fetchDocuments() {
        this.isLoading = true;
        const sharePointDomain = 'https://glduat.sharepoint.com';
        const siteName = 'sites/XansiumUATTestSite';
        const parentFolderPath = encodeURIComponent(`123`); // Required for some reason
        fetchTemplates()
            .then(result => {
                // Construct the SharePoint preview URL
                this.documents = result.map(doc => {
                    let previewUrl = `${sharePointDomain}/${siteName}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(doc.ServerRelativeURL__c)}&parent=${parentFolderPath}`;
                    // Determine the display name
                    let displayName = doc.Document_Name__c ? doc.Document_Name__c : doc.Name;
                    return {...doc, previewUrl, displayName};
                });
                
                // Group documents by categories
                this.groupDocumentsByCategory();
                this.isLoading = false;
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error:', error);
            });
    }

    groupDocumentsByCategory() {
        let categories = {};
        this.documents.forEach(doc => {
            let category = doc.Document_Category__c || 'Uncategorized';
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
        const selectedDocument = this.documents.find(doc => doc.DocumentID__c === this.selectedDocumentId);
        if (selectedDocument) {
            this.selectedDocumentType = selectedDocument.DocumentType__c;
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
}
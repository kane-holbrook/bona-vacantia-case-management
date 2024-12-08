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
    @track searchTerm = '';
    @track isSearching = false;
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
                this.documents = result.map(doc => {
                    let previewUrl = `${this.sharePointSiteUrl}/${this.sharePointDirectoryPath}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(doc.webUrl)}&parent=${parentFolderPath}`;
                    let displayName = doc.listItem.fields.Document_x0020_Name || doc.listItem.fields.DocumentName || doc.name;
                    return { 
                        ...doc, 
                        id: doc.id,
                        previewUrl, 
                        displayName,
                        DocumentType: doc.listItem.fields.DocumentType,
                        DocumentCategory: doc.listItem.fields.Document_x0020_Category || doc.listItem.fields.DocumentCategory,
                        Created_Time: doc.listItem.fields.Created,
                        ServerRelativeURL__c: doc.webUrl
                    };
                });

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
        this.isSearching = false;  // Reset search state when selecting a category
    }

    handleBackToCategories() {
        this.isCategorySelected = false;
        this.selectedCategory = '';
        this.filteredDocuments = [];
        this.searchTerm = '';
        this.isSearching = false;
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
            if (this.availableActions.includes('NEXT')) {
                const navigateNextEvent = new FlowNavigationNextEvent();
                this.dispatchEvent(navigateNextEvent);
            }
        } else {
            alert('Please select a document.');
        }
    }

    autoNavigateToNextStep() {
        if (this.availableActions.includes('NEXT')) {
            const navigateNextEvent = new FlowNavigationNextEvent();
            this.dispatchEvent(navigateNextEvent);
        }
    }

    handleSearchInputChange(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.isSearching = !!this.searchTerm;
        this.filterDocumentsBySearchTerm();
    }

    filterDocumentsBySearchTerm() {
        if (this.searchTerm) {
            this.filteredDocuments = this.documents.filter(doc => 
                (doc.displayName && doc.displayName.toLowerCase().includes(this.searchTerm)) ||
                (doc.DocumentType && doc.DocumentType.toLowerCase().includes(this.searchTerm))
            );
        } else if (this.isCategorySelected) {
            // Reset to show category documents when search is cleared
            this.filteredDocuments = this.documentCategories.find(cat => cat.name === this.selectedCategory).documents;
        } else {
            this.filteredDocuments = [];
        }
    }

    get hasFilteredDocuments() {
        return this.filteredDocuments.length > 0;
    }

    getAriaLabel(doc) {
        return 'Select ' + doc.displayName;
    }

    getAriaLabelForCategory(category) {
        return 'Select category ' + category.name;
    }

    get documentsWithAriaLabels() {
        return this.filteredDocuments.map(doc => ({
            ...doc,
            ariaLabel: `Select document ${doc.displayName}`
        }));
    }

    get categoriesWithAriaLabels() {
        return this.documentCategories.map(category => ({
            ...category,
            ariaLabel: 'Select category ' + category.name
        }));
    }
}

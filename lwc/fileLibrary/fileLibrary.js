import { LightningElement, api, wire, track } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import fetchAllDocumentsForCase from '@salesforce/apex/FileController.fetchAllDocumentsForCase';

const FIELDS = ['BV_Case__c.Name'];
const PAGE_SIZE = 20; // Number of records per page

export default class FileLibrary extends LightningElement {
    @api recordId;
    @track documents;
    @track filteredDocuments = [];
    @track displayDocuments = [];
    @track currentPage = 1;
    @track totalRecords = 0;
    @track searchTerm = '';
    @track documentTypeFilter = [];
    @track documentExtensionFilter = [];
    @track startDateFilter = '';
    @track endDateFilter = '';
    @track documentTypeOptions = [];
    @track documentExtensionOptions = [];
    @track isFilterSidebarOpen = false;
    isLoading = false;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    record;

    get bvCaseName() {
        return getFieldValue(this.record.data, 'BV_Case__c.Name');
    }

    connectedCallback() {
        setTimeout(() => {
            this.fetchDocuments();
        }, 0);
    }

    fetchDocuments() {
        this.isLoading = true;
        const sharePointDomain = 'https://glduat.sharepoint.com';
        const siteName = 'sites/XansiumUATTestSite';
        const parentFolderPath = encodeURIComponent(`123`); // Required for some reason
    
        fetchAllDocumentsForCase({ caseId: this.bvCaseName })
            .then(result => {
                this.documents = result.map(doc => {
                    // Construct the SharePoint preview URL
                    let previewUrl = `${sharePointDomain}/${siteName}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(doc.ServerRelativeURL__c)}&parent=${parentFolderPath}`;
                    // Return the document with the added previewUrl property
                    return {...doc, previewUrl};
                });
                this.totalRecords = this.documents.length;
                this.generateFilterOptions(); // Generate the filter options based on the documents
                this.applyFilters(); // Apply any existing filters and paginate
                this.isLoading = false;
                console.log('SharePoint documents:', this.documents);
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error fetching SharePoint documents:', error);
            });
    }

    handleSearch(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.applyFilters();
    }

    generateFilterOptions() {
        let documentTypes = new Set([]);
        let documentExtensions = new Set([]);
    
        this.documents.forEach(doc => {
            if (doc.DocumentType__c) {
                documentTypes.add(doc.DocumentType__c);
            }
            if (doc.DocumentExtension__c) {
                documentExtensions.add(doc.DocumentExtension__c);
            }
        });
    
        // Add 'All' option at the start of the arrays
        this.documentTypeOptions = [{ label: 'All', value: '' }, 
                                    ...Array.from(documentTypes).map(type => ({ label: type, value: type }))];
        this.documentExtensionOptions = [{ label: 'All', value: '' }, 
                                         ...Array.from(documentExtensions).map(ext => ({ label: ext, value: ext }))];
    }

    applyFilters() {
        // Start with all documents and then apply filters sequentially
        let filtered = [...this.documents];

        // Filter by search term
        if (this.searchTerm) {
            filtered = filtered.filter(doc => 
                doc.Name.toLowerCase().includes(this.searchTerm)
            );
        }

        // Filter by document type
        if (this.documentTypeFilter.length > 0 && this.documentTypeFilter[0] !== '') {
            filtered = filtered.filter(doc => this.documentTypeFilter.includes(doc.DocumentType__c));
        }

        // Filter by document extension
        if (this.documentExtensionFilter.length > 0 && this.documentExtensionFilter[0] !== '') {
            filtered = filtered.filter(doc => this.documentExtensionFilter.includes(doc.DocumentExtension__c));
        }

        // Filter by date range only if both start and end dates are provided
        if (this.startDateFilter && this.endDateFilter) {
            const startDate = new Date(this.startDateFilter);
            const endDate = new Date(this.endDateFilter);

            filtered = filtered.filter(doc => {
                const createdDate = new Date(doc.Created_Time__c);
                return createdDate >= startDate && createdDate <= endDate;
            });
        }

        this.filteredDocuments = filtered;
        this.totalRecords = filtered.length;
        this.currentPage = 1; // Reset to the first page after filtering
        this.updatePaginatedDocuments();
    }

    updatePaginatedDocuments() {
        const startIndex = (this.currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        this.displayDocuments = this.filteredDocuments.slice(startIndex, endIndex);
    }

    handlePreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage -= 1;
            this.updatePaginatedDocuments();
        }
    }
    
    handleNextPage() {
        if (this.currentPage < Math.ceil(this.totalRecords / PAGE_SIZE)) {
            this.currentPage += 1;
            this.updatePaginatedDocuments();
        }
    }

    handleDocumentTypeChange(event) {
        this.documentTypeFilter = event.detail.value;
        this.applyFilters();
    }
    
    handleDocumentExtensionChange(event) {
        this.documentExtensionFilter = event.detail.value;
        this.applyFilters();
    }

    handleStartDateChange(event) {
        this.startDateFilter = event.target.value;
        this.applyFilters();
    }

    handleEndDateChange(event) {
        this.endDateFilter = event.target.value;
        this.applyFilters();
    }

    toggleFilterSidebar() {
        this.isFilterSidebarOpen = !this.isFilterSidebarOpen;
    }

    clearDateFilters() {
        this.startDateFilter = '';
        this.endDateFilter = '';
        this.applyFilters();
    }

    get mainContentClass() {
        return `slds-col ${this.isFilterSidebarOpen ? 'slds-size_11-of-12' : 'slds-size_1-of-1'}`;
    }

    get isFirstPage() {
        return this.currentPage === 1;
    }
    
    get isLastPage() {
        return this.currentPage >= Math.ceil(this.totalRecords / PAGE_SIZE);
    }

    get containerClass() {
        return `slds-grid slds-gutters ${this.isFilterSidebarOpen ? 'slds-has-sidebar' : ''}`;
    }
}
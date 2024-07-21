import { LightningElement, api, wire, track } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import fetchAllDocumentsForCase from '@salesforce/apex/FileController.fetchAllDocumentsForCase';
import getSharePointSettings from '@salesforce/apex/FileController.getSharePointSettings';

const FIELDS = ['BV_Case__c.Name'];
const PAGE_SIZE = 10; // Number of records per page

const extensionMapping = {
    'pdf': 'PDF Document (.pdf)',
    'docx': 'Word Document (.docx)',
    'doc': 'Word Document (.doc)',
    'xls': 'Excel Spreadsheet (.xls)',
    'xlsx': 'Excel Spreadsheet (.xlsx)',
    'ppt': 'PowerPoint Presentation (.ppt)',
    'pptx': 'PowerPoint Presentation (.pptx)',
    'csv': 'CSV Spreadsheet (.csv)',
    'wpd': 'WordPerfect Document (.wpd)',
    'png': 'Image (.png)',
    'jpg': 'Image (.jpg)',
    'jpeg': 'Image (.jpeg)',
    'gif': 'Image (.gif)',
    'bmp': 'Image (.bmp)',
    'txt': 'Text Document (.txt)',
    'zip': 'ZIP Archive (.zip)',
    'rar': 'RAR Archive (.rar)',
    '7z': '7-Zip Archive (.7z)',
    'tar': 'TAR Archive (.tar)',
    'gz': 'GZIP Archive (.gz)',
    'bz2': 'BZIP2 Archive (.bz2)',
    'xz': 'XZ Archive (.xz)',
    'exe': 'Executable (.exe)',
    'msi': 'Windows Installer (.msi)',
};

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
    @track sharePointSiteUrl;
    @track sharePointDirectoryPath;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    record;

    get bvCaseName() {
        let caseName = getFieldValue(this.record.data, 'BV_Case__c.Name');
        // Replace all occurrences of '/' with '_'
        return caseName.replace(/\//g, '_');
    }

    connectedCallback() {
        this.fetchSharePointSettings();
    }

    fetchSharePointSettings() {
        this.isLoading = true;
        getSharePointSettings()
            .then(settings => {
                this.sharePointSiteUrl = settings.SharePoint_Site_URL;
                this.sharePointDirectoryPath = settings.SharePoint_Directory_Path;
                setTimeout(() => {
                    this.fetchDocuments();
                }, 1000);
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error fetching SharePoint settings:', error);
            });
    }

    fetchDocuments() {
        const parentFolderPath = encodeURIComponent(`123`);

        fetchAllDocumentsForCase({ caseId: this.bvCaseName })
            .then(result => {
                this.documents = result.map(doc => {
                    // Construct the SharePoint preview URL
                    let previewUrl = `${this.sharePointSiteUrl}/${this.sharePointDirectoryPath}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(doc.ServerRelativeURL__c)}&parent=${parentFolderPath}`;
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

        // Define preferred extensions
        const preferredExtensions = ['pdf', 'docx', 'doc', 'xls', 'xlsx', 'ppt', 'pptx'];

        this.documents.forEach(doc => {
            if (doc.DocumentType__c) {
                documentTypes.add(doc.DocumentType__c);
            }
            if (doc.DocumentExtension__c) {
                documentExtensions.add(doc.DocumentExtension__c);
            }
        });

        // Create options for preferred extensions first
        let extensionOptions = preferredExtensions
            .filter(ext => documentExtensions.has(ext))
            .map(ext => ({
                label: extensionMapping[ext],
                value: ext
            }));

        // Add other extensions
        extensionOptions.push(...Array.from(documentExtensions)
            .filter(ext => !preferredExtensions.includes(ext))
            .map(ext => ({ 
                label: extensionMapping[ext.toLowerCase()] || `${ext.toUpperCase()} File (${ext})`, 
                value: ext 
            })));

        // Add 'All' option at the start
        this.documentTypeOptions = [{ label: 'All', value: '' }, 
                                    ...Array.from(documentTypes).map(type => ({ label: type, value: type }))];
        this.documentExtensionOptions = [{ label: 'All', value: '' }, ...extensionOptions];
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
            startDate.setUTCHours(0, 0, 0, 0); // Set to the start of the day in UTC
            const endDate = new Date(this.endDateFilter);
            endDate.setUTCHours(23, 59, 59, 999); // Set to the end of the day in UTC

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

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage >= Math.ceil(this.totalRecords / PAGE_SIZE);
    }

    get pageInfo() {
        const startIndex = (this.currentPage - 1) * PAGE_SIZE + 1;
        const endIndex = Math.min(startIndex + PAGE_SIZE - 1, this.totalRecords);
        return `Page ${this.currentPage} - Showing ${startIndex}-${endIndex} of ${this.totalRecords} results`;
    }
}
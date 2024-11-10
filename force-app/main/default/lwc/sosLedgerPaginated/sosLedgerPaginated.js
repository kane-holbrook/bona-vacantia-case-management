import { LightningElement, track, wire, api } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import getSOSData from '@salesforce/apex/SOSFinanceController.getSOSData';
import reverseAccrual from '@salesforce/apex/SOSFinanceController.reverseAccrual';
import { getRecordId } from 'c/sharedService';

const FIELDS = ['BV_Case__c.Name', 'BV_Case__c.mtcode__c'];
const PAGE_SIZE = 20; // Number of records per page

export default class SosLedger extends LightningElement {
    @api recordId;
    @track fromDate;
    @track toDate;
    @track descriptionFilter;
    @track amountFilter;
    @track statusFilter = [];
    @track statusOptions = [];
    @track data = [];
    @track filteredData = [];
    @track isFilterSidebarOpen = false;
    @track currentPage = 1;
    @track totalRecords = 0;
    @track rangeStart = 0;
    @track rangeEnd = 0;
    isLoading = true;
    isModalOpen = false;
    isReverseAccrualModalOpen = false;

    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy;

    columns = [
        { 
            label: 'Date Posted', 
            fieldName: 'datePosted', 
            type: 'text', 
            sortable: true,
            ariaLabel: 'Sort by Date Posted'
        },
        { 
            label: 'Status', 
            fieldName: 'status', 
            type: 'text', 
            sortable: true,
            ariaLabel: 'Sort by Status'
        },
        { 
            label: 'Office Debit', 
            fieldName: 'officeDebit', 
            type: 'currency', 
            sortable: true,
            ariaLabel: 'Sort by Office Debit'
        },
        { 
            label: 'Office Credit', 
            fieldName: 'officeCredit', 
            type: 'currency', 
            sortable: true,
            ariaLabel: 'Sort by Office Credit'
        },
        { 
            label: 'Accruals Debit', 
            fieldName: 'accrualsDebit', 
            type: 'currency', 
            sortable: true,
            ariaLabel: 'Sort by Accruals Debit'
        },
        { 
            label: 'Accruals Credit', 
            fieldName: 'accrualsCredit', 
            type: 'currency', 
            sortable: true,
            ariaLabel: 'Sort by Accruals Credit'
        },
        { 
            label: 'Description', 
            fieldName: 'description', 
            type: 'text', 
            sortable: true, 
            wrapText: true,
            ariaLabel: 'Sort by Description'
        },
    ];

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    record;

    wiredSOSDataResult;

    connectedCallback() {
        this.recordId = getRecordId(this.record);
    }

    @wire(getSOSData, { mtcode: '$bvCaseName' })
    wiredSOSData(result) {
        this.wiredSOSDataResult = result;
        const { error, data } = result;
        if (data) {
            console.log('Result:', data);
            this.data = this.transformData(data);
            this.filteredData = [...this.data];
            this.isLoading = false;
            this.sortDirection = 'asc';
            this.sortedBy = 'datePosted';

            this.statusOptions = [...new Set(this.data.map(entry => entry.status))].map(status => ({
                label: status,
                value: status
            }));

            this.updatePageData();
        } else if (error) {
            console.error('Error fetching SOS data:', error);
            this.isLoading = false;
            this.data = [];
            this.filteredData = [];
            this.updatePageData();
        }
    }

    get bvCaseName() {
        let caseName = getFieldValue(this.record.data, 'BV_Case__c.Name');
        let mtCode = getFieldValue(this.record.data, 'BV_Case__c.mtcode__c');
        
        // Check if the caseName matches the new flexible format
        if (/^[A-Za-z]+\d+#\d+$/.test(caseName)) {
            return mtCode || '';
        }
        
        // Replace all occurrences of '/' with '_'
        return caseName ? caseName.replace(/\//g, '_') : '';
    }

    transformData(data) {
        if (!data || (!data.dsaccledger && !data.dsPostSlipCreate)) {
            console.warn('No data available to transform');
            return [];
        }

        // Transform dsaccledger data
        let transformedData = data.dsaccledger
            ? data.dsaccledger
                .filter(item => !item['UNDONE'])
                .map(item => ({
                    datePosted: new Date(item['POST-DATE']).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }),
                    status: (item['POST-TYPE'] === 'DR' || item['POST-TYPE'] === 'CR') ? 'Actioned' : 'Posted',
                    officeDebit: item['OFFICE-DEBIT'],
                    officeCredit: item['OFFICE-CREDIT'],
                    accrualsDebit: item['CLIENT-DEBIT'],
                    accrualsCredit: item['CLIENT-CREDIT'],
                    description: item['NARRATIVE']?.trim(),
                }))
            : [];

        // Transform and merge dsPostSlipCreate data
        if (data.dsPostSlipCreate) {
            const postSlipData = data.dsPostSlipCreate
                .filter(item => !item['UNDONE'])
                .map(item => {
                    let accrualsDebit = 0;
                    let accrualsCredit = 0;
                    const narrative = item['NARRATIVE']?.trim();
                    const net = parseFloat(item['NET']) || 0;

                    if (item['DRCR'] === 'DR') {
                        accrualsDebit = net;
                        console.log('accrualsDebit:', accrualsDebit);
                    } else if (item['DRCR'] === 'CR') {
                        accrualsCredit = net;
                        console.log('accrualsCredit:', accrualsCredit);
                    } else {
                        // Fallback to narrative-based logic when DRCR is empty
                        if (narrative.startsWith('EA')) {
                            accrualsCredit = net;
                        } else if (narrative.startsWith('EL')) {
                            accrualsDebit = net;
                        }
                    }

                    return {
                        datePosted: new Date(item['DATE-CREATED']).toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        }),
                        status: item['DRCR'] === 'DR' || item['DRCR'] === 'CR' ? 'Actioned' : 'Posted',
                        officeDebit: 0,
                        officeCredit: 0,
                        accrualsDebit,
                        accrualsCredit,
                        description: narrative,
                    };
                });

            // Merge the two datasets
            transformedData = [...transformedData, ...postSlipData];

            console.log('transformedData:', transformedData);
        }

        // Sort the combined data by date
        transformedData.sort((a, b) => {
            const dateA = this.parseUKDate(a.datePosted);
            const dateB = this.parseUKDate(b.datePosted);
    
            return dateA - dateB;
        });
    
        return transformedData;
    }

    filterData() {
        if (!this.data || this.data.length === 0) {
            this.filteredData = [];
            this.updatePageData();
            return;
        }

        this.filteredData = this.data.filter(entry => {
            // Convert the entry's datePosted to a Date object
            const entryDateParts = entry.datePosted.split('/');
            const entryDateObj = new Date(entryDateParts[2], parseInt(entryDateParts[1]) - 1, entryDateParts[0]);
    
            // Adjust fromDate and toDate to cover the entire day from 00:00:00 to 23:59:59
            const fromDateObj = this.fromDate ? new Date(this.fromDate + 'T00:00:00') : null;
            const toDateObj = this.toDate ? new Date(this.toDate + 'T23:59:59') : null;
    
            // Check if the entry's date is within the specified range
            const dateMatches = (!fromDateObj || entryDateObj >= fromDateObj) && 
                                (!toDateObj || entryDateObj <= toDateObj);
    
            // Check if the entry's description matches the filter
            const descriptionMatches = !this.descriptionFilter || entry.description.toLowerCase().includes(this.descriptionFilter.toLowerCase());
    
            // Check if the entry's amount matches the filter
            const amountMatches = !this.amountFilter || 
                                  entry.officeDebit.toString().startsWith(this.amountFilter?.toString()) || 
                                  entry.officeCredit.toString().startsWith(this.amountFilter?.toString()) || 
                                  entry.accrualsDebit.toString().startsWith(this.amountFilter?.toString()) || 
                                  entry.accrualsCredit.toString().startsWith(this.amountFilter?.toString());
    
            // Check if the entry's status matches the filter
            const statusMatches = this.statusFilter.length === 0 || this.statusFilter.includes(entry.status);
    
            // Include the entry if it matches all the filters
            return dateMatches && descriptionMatches && amountMatches && statusMatches;
        });

        // Reset to page 1 after filtering
        this.currentPage = 1;

        this.updatePageData();
    }

    handleStatusChange(event) {
        this.statusFilter = event.detail.value;
        this.filterData();
    }

    handleFromDateChange(event) {
        this.fromDate = event.target.value;
        this.filterData();
    }
    
    handleToDateChange(event) {
        this.toDate = event.target.value;
        this.filterData();
    }
    
    handleDescriptionChange(event) {
        this.descriptionFilter = event.target.value;
        this.filterData();
    }

    toggleFilterSidebar() {
        this.isFilterSidebarOpen = !this.isFilterSidebarOpen;
    }

    clearDateFilters() {
        this.fromDate = '';
        this.toDate = '';
        this.filterData();
    }

    clearAllFilters() {
        this.fromDate = null;
        this.toDate = null;
        this.descriptionFilter = '';
        this.amountFilter = null;
        this.statusFilter = [];
        this.filterData();
    }

    sortBy(field, reverse, primer) {
        const key = primer
            ? (x) => primer(x[field])
            : (x) => x[field];
    
        return function (a, b) {
            a = key(a);
            b = key(b);
            // Adjust sorting logic based on the reverse flag
            return reverse * ((a > b) - (b > a));
        };
    }

    parseUKDate(dateString) {
        const parts = dateString.split('/');
        // Note: Months are 0-based in JavaScript
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    announceSort(columnLabel, direction) {
        const announcement = `Table sorted by ${columnLabel} in ${direction === 'asc' ? 'ascending' : 'descending'} order`;
        
        // Create and append live region if it doesn't exist
        let liveRegion = this.template.querySelector('[role="status"]');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.setAttribute('role', 'status');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.classList.add('slds-assistive-text');
            this.template.querySelector('lightning-card').appendChild(liveRegion);
        }
        
        // Update the announcement
        liveRegion.textContent = announcement;
    }

    onHandleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.filteredData];
    
        if (this.sortedBy === sortedBy) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortDirection = sortDirection;
        }
    
        let primer;
    
        if (sortedBy === 'datePosted') {
            primer = (dateString) => {
                const parts = dateString.split('/');
                return new Date(parts[2], parts[1] - 1, parts[0]);
            };
        } else if (['officeDebit', 'officeCredit', 'accrualsDebit', 'accrualsCredit'].includes(sortedBy)) {
            primer = (value) => parseInt(value);
        }
    
        cloneData.sort(this.sortBy(sortedBy, this.sortDirection === 'asc' ? 1 : -1, primer));
    
        this.filteredData = cloneData;
        this.sortedBy = sortedBy;
    
        // Announce the sort change to screen readers
        const columnLabel = this.columns.find(col => col.fieldName === sortedBy).label;
        this.announceSort(columnLabel, this.sortDirection);
    
        this.updatePageData();
    }

    handleRowSelection(event) {
        // Event handling for row selection
    }

    openModal() {
        this.isModalOpen = true;
    }

    handleReverseAccrual() {
        this.isReverseAccrualModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    closeReverseAccrualModal() {
        this.isReverseAccrualModalOpen = false;
    }

    handleSelectedAccrual(event) {
        this.selectedAccrual = event.detail.selectedAccrual;
    }

    reverseAccrual() {
        if (!this.selectedAccrual) {
            console.error('No accrual selected');
            return;
        }

        // Determine the reversal type based on the selected accrual's transaction code
        const reversalType = this.selectedAccrual.transactionCode === 'DR' ? 'CR' : 'DR';

        reverseAccrual({
            MtCode: this.bvCaseName,
            Net: this.selectedAccrual.amount,
            Narrative: this.selectedAccrual.narrative,
            Reference: this.selectedAccrual.reference,
            Type: reversalType
        })
        .then(result => {
            console.log('Reversal Success:', result);
            this.refreshSosData();
            this.closeReverseAccrualModal();
        })
        .catch(error => {
            console.error('Reversal Error:', error);
        });
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePageData();
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePageData();
        }
    }
    
    updatePageData() {
        // Guard clause to handle cases where data isn't ready yet
        if (this.filteredData.length === 0) {
            this.pageData = [];
            this.totalRecords = 0;
            this.rangeStart = 0;
            this.rangeEnd = 0;
            return;
        }
    
        const start = (this.currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE; // Ensure end doesn't go beyond the array length
        this.pageData = this.filteredData.slice(start, end);

        this.totalRecords = this.filteredData.length;
        this.rangeStart = start + 1;
        this.rangeEnd = Math.min(end, this.filteredData.length);
    }

    handlePageButtonClick(event) {
        const selectedPage = parseInt(event.currentTarget.dataset.page, 10);
        if (selectedPage !== this.currentPage) {
            this.currentPage = selectedPage;
            this.updatePageData();
        }
    }

    get officeTotal() {
        const total = this.data.reduce((total, entry) => total + entry.officeDebit - entry.officeCredit, 0);
        if (total < 0) {
            return `-£${Math.abs(total).toFixed(2)}`;
        }
        return `£${total.toFixed(2)}`;
    }
    
    get accrualsTotal() {
        const total = this.data.reduce((total, entry) => total + entry.accrualsDebit - entry.accrualsCredit, 0);
        if (total < 0) {
            return `-£${Math.abs(total).toFixed(2)}`;
        }
        return `£${total.toFixed(2)}`;
    }

    get getTableMaxHeight() {
        return this.isFilterSidebarOpen ? 'max-height: 300px; overflow: auto;' : 'max-height: 500px; overflow: auto;';
    }

    get getTableContainerStyle() {
        return this.isFilterSidebarOpen ? 'margin-top: 22em;' : '';
    }

    get totalPages() {
        return Math.ceil(this.filteredData.length / PAGE_SIZE);
    }
    
    get isPreviousDisabled() {
        return this.currentPage <= 1;
    }
    
    get isNextDisabled() {
        return this.currentPage >= this.totalPages;
    }

    get previousButtonClasses() {
        return `slds-button slds-button_neutral ${this.isPreviousDisabled ? 'disabled-text' : ''}`;
    }
    
    get nextButtonClasses() {
        return `slds-button slds-button_neutral ${this.isNextDisabled ? 'disabled-text' : ''}`;
    }

    get pages() {
        return Array.from({ length: this.totalPages }, (_, i) => ({
            number: i + 1,
            class: `slds-button ${this.currentPage === i + 1 ? 'slds-button_brand' : 'slds-button_neutral'}`
        }));
    }

    refreshSosData() {
        return refreshApex(this.wiredSOSDataResult);
    }

    handleAccrualCreated() {
        this.refreshSosData();
        this.closeModal();
    }
}

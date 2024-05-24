import { LightningElement, track, wire, api } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import getSOSData from '@salesforce/apex/SOSFinanceController.getSOSData';
import reverseAccrual from '@salesforce/apex/SOSFinanceController.reverseAccrual';

const FIELDS = ['BV_Case__c.Name'];
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
    isLoading = false;
    isModalOpen = false;
    isReverseAccrualModalOpen = false;

    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy;

    columns = [
        { label: 'Date Posted', fieldName: 'datePosted', type: 'text', sortable: true },
        { label: 'Status', fieldName: 'status', type: 'text', sortable: true },
        { label: 'Office Debit', fieldName: 'officeDebit', type: 'currency', sortable: true },
        { label: 'Office Credit', fieldName: 'officeCredit', type: 'currency', sortable: true },
        { label: 'Accruals Debit', fieldName: 'accrualsDebit', type: 'currency', sortable: true },
        { label: 'Accruals Credit', fieldName: 'accrualsCredit', type: 'currency', sortable: true },
        { label: 'Description', fieldName: 'description', type: 'text', sortable: true, wrapText: true},
    ];

    get bvCaseName() {
        let caseName = getFieldValue(this.record.data, 'BV_Case__c.Name');
        // Replace all occurrences of '/' with '_'
        return caseName.replace(/\//g, '_');
    }

    transformData(data) {
        // First, transform the dsaccledger data
        let transformedData = data.dsaccledger.map(item => ({
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
        }));
    
        // Then, transform and merge the dsPostSlipCreate data
        if (data.dsPostSlipCreate) {
            const postSlipData = data.dsPostSlipCreate.map(item => {
                let accrualsDebit = item['DRCR'] === 'DR' ? item['NET'] : 0;
                let accrualsCredit = item['DRCR'] === 'CR' ? item['NET'] : 0;
                const narrative = item['NARRATIVE']?.trim();
    
                // Apply the necessary adjustments to the accrualsDebit and accrualsCredit values
                if (narrative.startsWith('EA2') || narrative.startsWith('EA3') || narrative.startsWith('EA4') || narrative.startsWith('EA5')) {
                    accrualsCredit = item['NET'];
                    accrualsDebit = 0;
                } else if (narrative.startsWith('EL1') || narrative.startsWith('EL2') || narrative.startsWith('EL3') || narrative.startsWith('EL4') || narrative.startsWith('EL5')) {
                    accrualsDebit = item['NET'];
                    accrualsCredit = 0;
                } else if (narrative.startsWith('Reversal EA') || narrative.startsWith('Reversal EL')) {
                    [accrualsDebit, accrualsCredit] = [accrualsCredit, accrualsDebit];
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
        }
    
        // Sort the combined data by date
        transformedData.sort((a, b) => {
            const dateA = this.parseUKDate(a.datePosted);
            const dateB = this.parseUKDate(b.datePosted);
    
            return dateA - dateB;
        });
    
        return transformedData;
    }

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    record;

    connectedCallback() {
        setTimeout(() => {
            this.fetchSOSData();
        }, 0);
    }

    fetchSOSData() {
        this.isLoading = true;
        getSOSData({ mtcode: this.bvCaseName })
            .then(result => {
                this.data = this.transformData(result);
                this.filteredData = [...this.data];
                this.isLoading = false;
                this.sortDirection = 'asc';
                this.sortedBy = 'datePosted';

                this.statusOptions = [...new Set(this.data.map(entry => entry.status))].map(status => ({
                    label: status,
                    value: status
                }));

                this.updatePageData();
            })
            .catch(error => {
                console.error(error);
                this.isLoading = false;
            });
    }

    filterData() {
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

    onHandleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.filteredData];
    
        // Determine if we need to toggle the sort direction
        if (this.sortedBy === sortedBy) {
            // If the same column is sorted again, toggle the direction
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // If a different column is sorted, use the provided direction
            this.sortDirection = sortDirection;
        }
    
        let primer;
    
        if (sortedBy === 'datePosted') {
            // Primer for date fields
            primer = (dateString) => {
                const parts = dateString.split('/');
                return new Date(parts[2], parts[1] - 1, parts[0]);
            };
        } else if (['officeDebit', 'officeCredit', 'accrualsDebit', 'accrualsCredit'].includes(sortedBy)) {
            // Primer for numeric fields
            primer = (value) => parseInt(value);
        }
    
        // Adjust the sort logic based on the direction
        cloneData.sort(this.sortBy(sortedBy, this.sortDirection === 'asc' ? 1 : -1, primer));
    
        this.filteredData = cloneData;
        this.sortedBy = sortedBy;
    
        // Update the page data to reflect the new sorting
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
    
        reverseAccrual({
            MtCode: this.bvCaseName,
            Net: this.selectedAccrual.amount,
            Narrative: this.selectedAccrual.narrative,
            Reference: this.selectedAccrual.reference,
            Type: 'DR'
        })
        .then(result => {
            console.log('Reversal Success:', result);
            window.location.reload();
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
}
import { LightningElement, api, track } from 'lwc';
import getSOSData from '@salesforce/apex/SOSFinanceController.getSOSData';

export default class SosReverseAccrual extends LightningElement {
    @api caseNumber;
    @track data = [];
    @track filteredData = [];
    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy;

    columns = [
        { label: 'Date Posted', fieldName: 'datePosted', type: 'text', sortable: true },
        { label: 'Transaction Code', fieldName: 'transactionCode', type: 'text', sortable: true },
        //{ label: 'Type', fieldName: 'type', type: 'text', sortable: true, cellAttributes: { class: 'slds-hide'} },
        { label: 'Amount', fieldName: 'amount', type: 'currency', sortable: true },
        //{ label: 'Reference', fieldName: 'reference', type: 'text', sortable: true, cellAttributes: { class: 'slds-hide'} },
        { label: 'Narrative', fieldName: 'narrative', type: 'text', sortable: true, wrapText: true },
        { label: 'SOS Code', fieldName: 'sosCode', type: 'text', sortable: true },
    ];

    connectedCallback() {
        setTimeout(() => {
            this.fetchSOSData();
        }, 0);
    }

    transformData(data) {
        return data.dsaccledger
            .filter(item => !item['NARRATIVE']?.trim().includes('Reversal of')) // Check if "Reversal of" is anywhere in the narrative
            .map(item => {
                const narrative = item['NARRATIVE']?.trim();
                let transactionCode = '';
                let sosCode = '';
    
                if (narrative.startsWith('EA')) {
                    transactionCode = 'ARE2';
                    sosCode = narrative.slice(0, 3);
                } else if (narrative.startsWith('EL')) {
                    transactionCode = 'APE1';
                    sosCode = narrative.slice(0, 3);
                }

                // Determine the non-zero amount
                let amount = 0;
                if (item['OFFICE-DEBIT'] !== 0) {
                    amount = item['OFFICE-DEBIT'];
                } else if (item['OFFICE-CREDIT'] !== 0) {
                    amount = item['OFFICE-CREDIT'];
                }
    
                return {
                    datePosted: new Date(item['POST-DATE']).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }),
                    transactionCode,
                    amount: amount,
                    reference: item['REFERENCE'],
                    narrative,
                    sosCode
                };
            });
    }

    fetchSOSData() {
        this.isLoading = true;
        getSOSData({ mtcode: this.caseNumber })
            .then(result => {
                this.data = this.transformData(result);
                this.filteredData = [...this.data];
            })
            .catch(error => {
                console.error(error);
            });
    }

    sortBy(field, reverse, primer) {
        const key = primer
            ? function (x) {
                  return primer(x[field]);
              }
            : function (x) {
                  return x[field];
              };

        return function (a, b) {
            a = key(a);
            b = key(b);
            return reverse * ((a > b) - (b > a));
        };
    }

    onHandleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.filteredData];
        cloneData.sort(this.sortBy(sortedBy, sortDirection === 'asc' ? 1 : -1));
        this.filteredData = cloneData;
        this.sortDirection = sortDirection;
        this.sortedBy = sortedBy;
    }

    handleRowSelection(event) {
        const selectedRows = event.detail.selectedRows;
        // Dispatch an event with the selected accrual
        if (selectedRows.length > 0) {
            const selectedAccrualEvent = new CustomEvent('selectedaccrual', {
                detail: { selectedAccrual: selectedRows[0] },
                bubbles: true, // To let the event bubble up through the DOM
            });
            this.dispatchEvent(selectedAccrualEvent);
        }
    }
}
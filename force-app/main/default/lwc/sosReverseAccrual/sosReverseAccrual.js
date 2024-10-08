import { LightningElement, api, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getSOSData from '@salesforce/apex/SOSFinanceController.getSOSData';

export default class SosReverseAccrual extends LightningElement {
    @api caseNumber;
    @track data = [];
    @track filteredData = [];
    @track error;
    wiredSOSData;
    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy;

    columns = [
        { label: 'Date Posted', fieldName: 'datePosted', type: 'text', sortable: true },
        { label: 'Transaction Code', fieldName: 'transactionCode', type: 'text', sortable: true },
        { label: 'Amount', fieldName: 'amount', type: 'currency', sortable: true },
        { label: 'Narrative', fieldName: 'narrative', type: 'text', sortable: true, wrapText: true },
        { label: 'SOS Code', fieldName: 'sosCode', type: 'text', sortable: true },
    ];

    @wire(getSOSData, { mtcode: '$caseNumber' })
    wiredGetSOSData(result) {
        this.wiredSOSData = result;
        if (result.data) {
            this.error = undefined;
            this.data = this.transformData(result.data);
            this.filteredData = [...this.data];
        } else if (result.error) {
            this.error = result.error;
            this.data = [];
            this.filteredData = [];
        }
    }

    transformData(data) {
        if (!data || !data.dsaccledger) {
            return [];
        }
        return data.dsaccledger
            .filter(item => item && item['NARRATIVE'] && !item['NARRATIVE'].trim().includes('Reversal of'))
            .map(item => {
                const narrative = item['NARRATIVE'] ? item['NARRATIVE'].trim() : '';
                let transactionCode = '';
                let sosCode = '';
    
                if (narrative.startsWith('EA')) {
                    transactionCode = 'ARE2';
                    sosCode = narrative.slice(0, 3);
                } else if (narrative.startsWith('EL')) {
                    transactionCode = 'APE1';
                    sosCode = narrative.slice(0, 3);
                }

                let amount = 0;
                if (item['OFFICE-DEBIT'] !== undefined && item['OFFICE-DEBIT'] !== 0) {
                    amount = item['OFFICE-DEBIT'];
                } else if (item['OFFICE-CREDIT'] !== undefined && item['OFFICE-CREDIT'] !== 0) {
                    amount = item['OFFICE-CREDIT'];
                }
    
                return {
                    datePosted: item['POST-DATE'] ? new Date(item['POST-DATE']).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }) : '',
                    transactionCode,
                    amount: amount,
                    reference: item['REFERENCE'] || '',
                    narrative,
                    sosCode
                };
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
        if (selectedRows && selectedRows.length > 0) {
            const selectedAccrualEvent = new CustomEvent('selectedaccrual', {
                detail: { selectedAccrual: selectedRows[0] },
                bubbles: true,
            });
            this.dispatchEvent(selectedAccrualEvent);
        }
    }

    @api
    refreshData() {
        return refreshApex(this.wiredSOSData);
    }
}
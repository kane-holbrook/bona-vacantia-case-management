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
        if (!data) {
            return [];
        }

        let transformedData = [];

        // Process dsaccledger data
        if (data.dsaccledger) {
            transformedData = data.dsaccledger
                .filter(item => 
                    item && 
                    ((item['CLIENT-DEBIT'] !== undefined && item['CLIENT-DEBIT'] !== 0) || 
                     (item['CLIENT-CREDIT'] !== undefined && item['CLIENT-CREDIT'] !== 0))
                )
                .map(item => ({
                    datePosted: item['POST-DATE'] ? new Date(item['POST-DATE']).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }) : '',
                    transactionCode: item['CLIENT-CREDIT'] !== undefined && item['CLIENT-CREDIT'] !== 0 ? 'DR' : 'CR',
                    amount: item['CLIENT-DEBIT'] || item['CLIENT-CREDIT'] || 0,
                    reference: item['REFERENCE'] || '',
                    narrative: item['NARRATIVE'] ? item['NARRATIVE'].trim() : '',
                    sosCode: this.extractSosCode(item['NARRATIVE'])
                }));
        }

        // Process dsPostSlipCreate data
        if (data.dsPostSlipCreate) {
            const postSlipData = data.dsPostSlipCreate
                .filter(item => 
                    item && 
                    item['NET'] !== undefined && item['NET'] !== 0
                )
                .map(item => ({
                    datePosted: item['DATE-CREATED'] ? new Date(item['DATE-CREATED']).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }) : '',
                    transactionCode: item['DRCR'],
                    amount: item['NET'] || 0,
                    reference: item['REFERENCE'] || '',
                    narrative: item['NARRATIVE'] ? item['NARRATIVE'].trim() : '',
                    sosCode: this.extractSosCode(item['NARRATIVE'])
                }));

            transformedData = [...transformedData, ...postSlipData];
        }

        // Sort the combined data by date
        return transformedData.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));
    }

    extractSosCode(narrative) {
        if (narrative) {
            if (narrative.startsWith('EA') || narrative.startsWith('CA')) {
                return narrative.slice(0, 3);
            } else if (narrative.startsWith('EL') || narrative.startsWith('CL')) {
                return narrative.slice(0, 3);
            }
        }
        return '';
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
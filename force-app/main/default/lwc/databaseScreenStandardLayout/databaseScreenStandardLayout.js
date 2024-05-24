import { LightningElement, api, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getLayout from '@salesforce/apex/LayoutController.getLayout';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class DatabaseScreenStandardLayout extends LightningElement {
    _objectApiName;
    _recordTypeId;
    _label;
    _parentLabel;

    @track layoutSections = [];
    @track recordData;
    @track columns = [];
    @track tableData = [];
    @track sortedBy;
    @track sortedDirection;
    @track subRecordId;
    hasDataBeenUpdated = false;
    isModalOpen = false;
    isModalOpenDelete = false;

    // Stuff for table
    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy;

    // To store wired result for refresh
    wiredLayoutResult;

    @api
    get objectApiName() {
        return this._objectApiName;
    }

    set objectApiName(value) {
        this._objectApiName = value;
        this.loadLayout();
    }

    @api
    get recordTypeId() {
        return this._recordTypeId;
    }

    set recordTypeId(value) {
        this._recordTypeId = value;
        this.loadLayout();
    }

    @api
    get label() {
        return this._label;
    }

    set label(value) {
        this._label = value;
    }

    @api
    get parentLabel() {
        return this._parentLabel;
    }

    set parentLabel(value) {
        this._parentLabel = value;
    }

    @api recordId;

    @wire(getLayout, { objectApiName: '$objectApiName', recordTypeId: '$recordTypeId', recordId: '$recordId' })
    wiredLayout(result) {
        this.wiredLayoutResult = result;
        const { error, data } = result;
        if (data) {
            console.log('Layout Data:', data);
    
            // Handle recordData for BV_Case__c as a single record
            if (this.objectApiName === 'BV_Case__c') {
                this.recordData = [data.recordData[0] || {}]; // Ensure recordData is an array with a single object
            } else {
                this.recordData = data.recordData;
            }
    
            // Create deep copies of layoutSections and attach field values
            this.layoutSections = JSON.parse(JSON.stringify(data.sections));
            let tableDataTemp = []; // Adjusted for multiple records
            let columnsTemp = [];
    
            this.layoutSections.forEach(section => {
                section.layoutRows.forEach(row => {
                    row.layoutItems.forEach(item => {
                        item.layoutComponents
                            .filter(component => component.apiName !== 'Name' && component.apiName !== 'Stage__c' && component.apiName !== 'BV_Case__c')
                            .forEach(component => {
                                // Set column definitions if not already set
                                if (!columnsTemp.some(col => col.fieldName === component.apiName)) {
                                    columnsTemp.push({
                                        label: component.label,
                                        fieldName: component.apiName,
                                        type: 'text'
                                    });
                                }
                            });
                    });
                });
            });
    
            // Set table data for multiple records
            this.recordData.forEach(record => {
                let recordTemp = {};
                columnsTemp.forEach(col => {
                    const fieldValue = this.getFieldValueFromRecord(record, col.fieldName);
                    if (fieldValue !== null && fieldValue !== undefined) {
                        recordTemp[col.fieldName] = fieldValue;
                    }
                });
                // Add subRecordId if applicable
                if (this.objectApiName !== 'BV_Case__c') {
                    recordTemp.subRecordId = record.Id; // or however you derive the sub-record ID
                }
                tableDataTemp.push(recordTemp);
            });
    
            // Add row actions column
            columnsTemp.push({ type: 'action', typeAttributes: { rowActions: this.getRowActions.bind(this) } });
    
            // Make all columns sortable
            columnsTemp = columnsTemp.map(col => {
                return { ...col, sortable: true };
            });
    
            // Filter out empty columns
            columnsTemp = columnsTemp.filter((col, index) => {
                // Exclude the very first blank field (index === 0) if it exists
                if (index === 0) {
                    const fieldValue = tableDataTemp[0][col.fieldName];
                    return fieldValue !== null && fieldValue !== undefined;
                }
                return true; // Include all other columns
            });
    
            this.columns = columnsTemp;
            this.tableData = tableDataTemp;
    
            console.log('Columns:', this.columns);
            console.log('Table Data:', this.tableData);
        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading layout',
                    message: error.body.message,
                    variant: 'error',
                }),
            );
        }
    }
    
    // Helper method to get field value from a record
    getFieldValueFromRecord(record, apiName) {
        return record ? record[apiName] : null;
    }

    loadLayout() {
        // Manually refresh the wire adapter when the objectApiName or recordTypeId changes. Or when we update data.
        if (this._objectApiName && this._recordTypeId || this.hasDataBeenUpdated) {
            refreshApex(this.wiredLayoutResult);
        }
    }

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
        this.subRecordId = null;
    }

    openModalDelete() {
        this.isModalOpenDelete = true;
    }

    closeModalDelete() {
        this.isModalOpenDelete = false;
        this.subRecordId = null;
    }

    getRowActions(row, doneCallback) {
        const actions = [
            { label: 'Edit', name: 'edit'},
            { label: 'Delete', name: 'delete' }
        ];
        doneCallback(actions);
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        const recordId = this.objectApiName === 'BV_Case__c' ? row.Id : row.subRecordId;
        this.subRecordId = recordId;
        switch (actionName) {
            case 'delete':
                this.isModalOpenDelete = true;
                break;
            case 'edit':
                this.isModalOpen = true;
                console.log(row);
                break;
            default:
        }
    }

    handleRecordUpdated() {
        this.isModalOpen = false;

        this.hasDataBeenUpdated = true;

        // Refresh the layout
        this.loadLayout();

        // Show success message
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Your changes have been saved.',
                variant: 'success',
            }),
        );

        this.hasDataBeenUpdated = false;
    }

    handleRecordDeleted() {
        this.isModalOpenDelete = false;

        this.hasDataBeenUpdated = true;

        // Refresh the layout
        this.loadLayout();

        // Show success message
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'The record has been deleted.',
                variant: 'success',
            }),
        );

        this.hasDataBeenUpdated = false;
    }

    handleCancelUpdate() {
        this.isModalOpenDelete = false;
        this.isModalOpen = false;
    }

    onHandleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.tableData];

        cloneData.sort(this.sortBy(sortedBy, sortDirection === 'asc' ? 1 : -1));
        this.tableData = cloneData;
        this.sortDirection = sortDirection;
        this.sortedBy = sortedBy;
    }

    sortBy(field, reverse, primer) {
        const key = primer
            ? function(x) {
                return primer(x[field]);
            }
            : function(x) {
                return x[field];
            };

        return function(a, b) {
            a = key(a);
            b = key(b);
            return reverse * ((a > b) - (b > a));
        };
    }

    get cardHeader() {
        return this.layoutSections ? this.layoutSections.heading : 'Loading...';
    }

    get cardSubtitle() {
        if (this._label) {
            // If label is present, construct the subtitle as "parentLabel > label"
            return `${this._parentLabel} > ${this._label}`;
        } else {
            // If no label, return only the parent label
            return this._parentLabel;
        }
    }

    get hasData() {
        // Check if there are columns and data available
        return this.columns.length > 0 && Object.keys(this.tableData[0]).length > 0;
    }

    get isBVCase() {
        return this.objectApiName === 'BV_Case__c';
    }
}
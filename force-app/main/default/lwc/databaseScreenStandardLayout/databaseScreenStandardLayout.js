import { LightningElement, api, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getLayout from '@salesforce/apex/LayoutController.getLayout';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class DatabaseScreenStandardLayout extends LightningElement {
    _objectApiName;
    _recordTypeId;
    _label;
    _parentLabel;

    @track tableDataObj = [];

    //columnsMain is to store table headers; columns is to store all fields; sectionsMain is used to store section title
    @track layoutSections = [];
    @track sectionsMain = [];
    @track recordData;
    @track columns = [];
    @track columnsMain = [];
    @track tableData = [];
    @track combinedData = [];
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
            console.log('Layout Data: ', JSON.stringify(data));
    
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
            let columnsMainTemp = new Map();
    
            this.layoutSections.forEach(section => {
                section.layoutRows.forEach(row => {
                    row.layoutItems.forEach(item => {
                        item.layoutComponents
                            .filter(component => component.apiName !== 'Name' && component.apiName !== 'Stage__c' && component.apiName !== 'BV_Case__c')
                            .forEach(component => {
                                // Set column definitions if not already set + filter empty spaces on page layout
                                if ((!columnsTemp.some(col => col.fieldName === component.apiName)) && (component.apiName !== null && component.apiName !== undefined)) {
                                    //Section at index 2 contains all fields used on the screen
                                    if(section == this.layoutSections[2]){
                                        columnsTemp.push({
                                            label: component.label,
                                            fieldName: component.apiName,
                                            type: 'text'
                                        });
                                    }
                                    //Section at index 0 contains table headers (filter by section so fields are not repeated in variables)
                                    if(section == this.layoutSections[0]){
                                        section.heading = 'headers';
                                        columnsMainTemp.set(component.apiName, section.heading);
                                    }
                                }
                            });
                    });
                });
            });
    
            // Set table data for multiple records
            this.recordData.forEach(record => {
                //Add record id to later be used for matching field values and as a key for template tags
                let recordTemp = {
                    rowId: record.Id
                };
                columnsTemp.forEach(col => {
                    const fieldValue = this.getFieldValueFromRecord(record, col.fieldName);
                    if (col.fieldName !== null && col.fieldName !== undefined) {
                        recordTemp[col.fieldName] = fieldValue;
                    }
                });
                // Add subRecordId if applicable
                if (this.objectApiName !== 'BV_Case__c') {
                    recordTemp.subRecordId = record.Id; // or however you derive the sub-record ID
                }
                tableDataTemp.push(recordTemp);
            });
            console.log('tableDataTemp: ', JSON.stringify(tableDataTemp));
    
            // Add row actions column, this may no longer be needed with new table component (action column is hardcoded) but doesn't currently seem to affect data prepping
            columnsTemp.push({ type: 'action', typeAttributes: { rowActions: this.getRowActions.bind(this) } });
    
            // Make all columns sortable
            columnsTemp = columnsTemp.map(col => {
                return { ...col, sortable: true };
            });
    
            // Filter out empty columns, appears this is no longer needed with new table component
            /*columnsTemp = columnsTemp.filter((col, index) => {
                // Exclude the very first blank field (index === 0) if it exists
                if (index === 0) {
                    const fieldValue = tableDataTemp[0][col.fieldName];
                    return fieldValue !== null && fieldValue !== undefined;
                }
                return true; // Include all other columns
            });*/

            //Was previously used to filter table header fields but could now probably be refactored into the nested loop above
            let columnsMainFiltered = [];
            columnsTemp.forEach(col => {
                let colSection = columnsMainTemp.get(col.fieldName);
                if(colSection != undefined){
                    if(col.type !== 'action'){
                        columnsMainFiltered.push(col);
                    }
                }
            });
    
            //sectionsMain is only used for screen title, could be refactored as string variable and remove the outer template tag from html
            this.columnsMain = columnsMainFiltered;
            this.columns = columnsTemp;
            this.tableData = tableDataTemp;
            let mainSection = [];
            mainSection = [...mainSection, this.layoutSections[1]];
            this.sectionsMain = mainSection;

            //create object array to be used for the table data
            let tableDataObjTemp = [];
            this.tableData.forEach(function(row, i) {
                let rowId = row.rowId;
                let keys = Object.keys(row);
                //stop header fields from appearing twice
                keys.forEach(key => {
                    let isHeader = columnsMainTemp.get(key);
                    if(isHeader === null || isHeader === undefined){
                        delete row[key];
                    }
                });
                let values = Object.values(row);
                let valueMap = [];
                values.forEach(function(value, i2) {
                    const valueItem = {
                        Id: i2,
                        value: value
                    };
                    valueMap.push(valueItem);
                });
                const item = {
                    Id: rowId,
                    Cells: valueMap
                }
                tableDataObjTemp.push(item);
            });
            this.tableDataObj = tableDataObjTemp;

            //Prep data for expanded view field values
            let filteredData = this.recordData;
            if(this.subRecordId){
                filteredData = this.recordData.filter(record => record.Id === this.subRecordId);
            }

            this.combinedData = filteredData.map(record => ({
                id: record.Id,
                fields: this.columns
                    .filter(column => column.type !== 'action')
                    .map(column => ({
                        label: column.label,
                        fieldName: column.fieldName,
                        type: column.type === 'action' ? 'text' : column.type, // Default to text if action
                        value: record[column.fieldName] || '—'
                    }))
            }));

            //Merge table data with expanded view field values
            this.tableDataObj.forEach(row => {
                row['fullData'] = this.combinedData.filter(dataRow => dataRow.id === row.Id);
            });
    
            console.log('Columns Map: ', columnsMainTemp);
            console.log('Columns Main: ', JSON.stringify(this.columnsMain));
            console.log('Sections Main: ', JSON.stringify(this.sectionsMain));
            console.log('Columns:', JSON.stringify(this.columns));
            console.log('Table Data:', JSON.stringify(this.tableData, this.replacer));
            console.log('Table Data Object: ', JSON.stringify(this.tableDataObj));
            console.log('Record Data: ', JSON.stringify(this.recordData, this.replacer));
            console.log('Combined Data: ', JSON.stringify(this.combinedData));
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
        console.log(event.target.dataset.row);
        console.log(event.detail);
        const actionName = event.detail.value;
        console.log(actionName);
        //const row = event.detail.row;

        //const recordId = this.objectApiName === 'BV_Case__c' ? row.Id : row.subRecordId;
        const recordId = event.target.data.row;
        this.subRecordId = recordId;
        switch (actionName) {
            case 'delete':
                this.isModalOpenDelete = true;
                break;
            case 'edit':
                this.isModalOpen = true;
                //console.log(row);
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

    //Handle expanded view dropdown event
    expandSection(event){
        var targetRow = event.currentTarget.dataset.targetrow;
        console.log(targetRow);
        var queryString = 'div[data-rowid="' + targetRow + '"]';
        var rowEle = this.template.querySelector(queryString);
        console.log(rowEle);
        console.dir(event.target);
        if(rowEle.style.display === 'none'){
            rowEle.style.display = 'block';
        }else{
            rowEle.style.display = 'none';
        }
        if(event.target.iconName === 'utility:chevronright'){
            event.target.iconName = 'utility:chevrondown';
        }else{
            event.target.iconName = 'utility:chevronright';
        }
    }

    //utility method to show blank object values in console
    replacer(key, value){
        if(value === undefined || value === null){
            return 'null';
        }
        return value;
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
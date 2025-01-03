import { LightningElement, api, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getLayout from '@salesforce/apex/LayoutController.getLayout';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import { getRecordId } from 'c/sharedService';
import { subscribe, unsubscribe, onError, setDebugFlag, isEmpEnabled } from 'lightning/empApi';

export default class DatabaseScreenStandardLayout extends LightningElement {
    _objectApiName;
    _recordTypeId;
    _label;
    _parentLabel;

    @track tableDataObj = [];

    // columnsMain is to store table headers; columns is to store all fields; sectionsMain is used to store section title
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
    @track columnLayoutStyle = 2;
    @track emptySpaceIndices = [];
    @track populatedLeftColumnFields = [];
    @track populatedRightColumnFields = [];
    @track relatedAccounts;
    @track databaseScreenHeading;

    hasDataBeenUpdated = false;
    isModalOpen = false;
    isModalOpenDelete = false;
    expandedView = true;
    lastFocusedElement;

    // Subscription
    subscription = {};
    channelName = '/event/CaseTypeChangeEvent__e';

    // Stuff for table
    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy;

    // To store wired result for refresh
    wiredLayoutResult;

    // Initialize expanded state for each row
    @track expandedRows = new Set();

    @api
    get objectApiName() {
        return this._objectApiName;
    }

    set objectApiName(value) {
        this._objectApiName = value;
        this.resetComponent();
        this.loadLayout();
    }

    @api
    get recordTypeId() {
        return this._recordTypeId;
    }

    set recordTypeId(value) {
        this._recordTypeId = value;
        this.resetComponent();
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

    @api
    get parentGrandchildLabel() {
        return this._parentGrandchildLabel;
    }

    set parentGrandchildLabel(value) {
        this._parentGrandchildLabel = value;
    }

    @api
    get parentGreatGrandchildLabel() {
        return this._parentGreatGrandchildLabel;
    }

    set parentGreatGrandchildLabel(value) {
        this._parentGreatGrandchildLabel = value;
    }

    @api recordId;

    disconnectedCallback(){
        this.handleUnsubscribe();
    }

    // Handles subscribe button click
    handleSubscribe() {
        // Callback triggered whenever a new event message is received
        const messageCallback = (response) => {
            console.log('New message received: ', JSON.stringify(response));
            // Process the event message here
            this.handleCaseTypeEvent(response.data.payload);
        };

        // Invoke subscribe method of empApi. Pass reference to messageCallback
        subscribe(this.channelName, -1, messageCallback).then(response => {
            // Response contains the subscription information on subscribe call
            console.log('Subscription request sent to: ', JSON.stringify(response.channel));
            this.subscription = response;

            console.log('subscription', this.subscription);
        });
    }

    handleUnsubscribe() {
        unsubscribe(this.subscription, response => {
            console.log('unsubscribe() response: ', JSON.stringify(response));
        });
    }

    registerErrorListener() {
        // Invoke onError empApi method
        onError(error => {
            console.log('Received error from server: ', JSON.stringify(error));
        });
    }

    handleCaseTypeEvent(eventData) {
        refreshApex(this.wiredLayoutResult);
    }

    @wire(getLayout, { objectApiName: '$objectApiName', recordTypeId: '$recordTypeId', recordId: '$recordId' })
    wiredLayout(result) {
        this.wiredLayoutResult = result;
        const { error, data } = result;
        if (data) {
            console.log('Layout Data: ', JSON.stringify(data));

            let isMultipleRecords = false;

            // Check if the layout contains "Multiple Records: YES"
            data.sections.forEach(section => {
                if (section.heading && section.heading.includes("Multiple Records: YES")) {
                    isMultipleRecords = true;
                    this.multipleRecords = true;
                }
            });

            // Check if the layout contains "Expanded View: NO"
            data.sections.forEach(section => {
                if (section.heading && section.heading.includes("Expanded View: NO")) {
                    this.expandedView = false;
                }
            });

            // Handle recordData based on Multiple Records
            if (isMultipleRecords) {
                this.recordData = data.recordData;
            } else {
                this.recordData = [data.recordData[0] || {}]; // Ensure recordData is an array with a single object
            }

            console.log('Initial Record Data: ', JSON.stringify(this.recordData));

            // Store relatedAccounts in a component property
            this.relatedAccounts = data.relatedAccounts || {};

            // Extract fieldDataTypes from data
            const fieldDataTypes = data.fieldDataTypes || {};
            this.fieldDataTypes = fieldDataTypes; // Store the fieldDataTypes for later use

            // Create deep copies of layoutSections and attach field values
            this.layoutSections = JSON.parse(JSON.stringify(data.sections));
            let tableDataTemp = []; // Adjusted for multiple records
            let columnsTemp = [];
            let columnsMainTemp = [];

            // Process fields into left and right columns
            this.splitFieldsByColumns();

            // Detect consecutive "EmptySpace" components in left and right columns
            this.emptySpaceIndices = []; // Reset the emptySpaceIndices array

            for (let i = 0; i < this.leftColumnFields.length; i++) {
                if (this.leftColumnFields[i].componentType === 'EmptySpace' && this.rightColumnFields[i].componentType === 'EmptySpace') {
                    this.emptySpaceIndices.push(i);
                    // Log the labels of the fields before and after the empty spaces
                    const beforeLabel = i > 0 ? this.getFieldLabelFromColumn(i - 1) : 'No field';
                    const afterLabel = i < this.leftColumnFields.length - 1 ? this.getFieldLabelFromColumn(i + 1) : 'No field';
                    console.log(`Empty spaces detected at row ${i}`);
                    console.log(`Field before empty spaces: ${beforeLabel}`);
                    console.log(`Field after empty spaces: ${afterLabel}`);
                }
            }

            console.log('Empty Space Indices: ', this.emptySpaceIndices);

            // Adjust emptySpaceIndices
            this.adjustEmptySpaceIndices();

            this.layoutSections.forEach(section => {
                section.layoutRows.forEach(row => {
                    row.layoutItems.forEach(item => {
                        item.layoutComponents
                            .filter(component => component.apiName !== 'Name' && component.apiName !== 'Stage__c' && component.apiName !== 'BV_Case__c')
                            .forEach(component => {
                                // Set column definitions if not already set + filter empty spaces on page layout
                                if ((!columnsTemp.some(col => col.fieldName === component.apiName)) && (component.apiName !== null && component.apiName !== undefined)) {
                                    // Section at index 2 contains all fields used on the screen
                                    if (section === this.layoutSections[2]) {
                                        const fieldType = fieldDataTypes[component.apiName] || 'text';
                                        let columnType = 'text'; // default type
                                        let length = null; // variable to store the number in the field type

                                        // Check the field type and adjust columnType and length accordingly
                                        if (fieldType.startsWith('Long Text Area')) {
                                            columnType = 'long-text';
                                            const match = fieldType.match(/\((\d+)\)/); // Regex to find length in type definition
                                            if (match) {
                                                length = parseInt(match[1], 10);
                                            }
                                        } else if (fieldType.startsWith('Text') || fieldType === 'String') {
                                            columnType = 'text';
                                            const match = fieldType.match(/\((\d+)\)/); // Regex to find length in type definition
                                            if (match) {
                                                length = parseInt(match[1], 10);
                                            }
                                        } else if (fieldType === 'TextArea') {
                                            columnType = 'textarea';
                                        } else if (fieldType === 'EncryptedString') {
                                            columnType = 'encrypted-text';
                                        } else if (fieldType === 'Picklist') {
                                            columnType = 'picklist';
                                        } else if (fieldType === 'Picklist (Multi-Select)') {
                                            columnType = 'multipicklist';
                                        } else if (fieldType.startsWith('Number') || fieldType === 'Integer' || fieldType === 'Double') {
                                            columnType = 'number';
                                            const match = fieldType.match(/\((\d+),\s*(\d+)\)/);
                                            if (match) {
                                                length = { precision: parseInt(match[1], 10), scale: parseInt(match[2], 10) };
                                            }
                                        } else if (fieldType === 'Percent') {
                                            columnType = 'percent';
                                            const match = fieldType.match(/\((\d+),\s*(\d+)\)/);
                                            if (match) {
                                                length = { precision: parseInt(match[1], 10), scale: parseInt(match[2], 10) };
                                            }
                                        } else if (fieldType.startsWith('Currency')) {
                                            columnType = 'currency';
                                            const match = fieldType.match(/\((\d+),\s*(\d+)\)/);
                                            if (match) {
                                                length = { precision: parseInt(match[1], 10), scale: parseInt(match[2], 10) };
                                            }
                                        } else if (fieldType === 'Date') {
                                            columnType = 'date';
                                        } else if (fieldType === 'Date/Time') {
                                            columnType = 'datetime';
                                        } else if (fieldType === 'Email') {
                                            columnType = 'email';
                                        } else if (fieldType === 'Phone') {
                                            columnType = 'tel';
                                        } else if (fieldType === 'URL') {
                                            columnType = 'url';
                                        } else if (fieldType === 'Checkbox' || fieldType === 'Boolean') {
                                            columnType = 'checkbox';
                                        } else if (fieldType === 'Time') {
                                            columnType = 'time';
                                        } else if (fieldType === 'File') {
                                            columnType = 'file';
                                        } else if (fieldType === 'Password') {
                                            columnType = 'password';
                                        } else if (fieldType === 'Search') {
                                            columnType = 'search';
                                        } else if (fieldType === 'Toggle') {
                                            columnType = 'toggle';
                                        } else if (fieldType.startsWith('Lookup')) {
                                            columnType = 'lookup';
                                        } else {
                                            columnType = 'text'; // Default to text if no other type matches
                                        }

                                        // Construct the column object
                                        const column = {
                                            label: this.decodeHtmlEntities(component.label), // Decode HTML entities in the label
                                            fieldName: component.apiName,
                                            type: columnType
                                        };

                                        // Add length if available
                                        if (length !== null) {
                                            column.length = length;
                                        }

                                        columnsTemp.push(column);
                                    }

                                    console.log('sections temp', columnsTemp);

                                    console.log(section);
                                    console.log(this.layoutSections[0]);

                                    // Construct the column object
                                    const column = {
                                        label: this.decodeHtmlEntities(component.label), // Decode HTML entities in the label
                                        fieldName: component.apiName,
                                        type: 'text'
                                    };

                                    // Section at index 0 contains table headers (filter by section so variables are separated)
                                    if (!this.isBVCase) {
                                        if (this.expandedView) {
                                            // Run the 0 index check when not bvCase and expanded view
                                            if (section === this.layoutSections[0]) {
                                                columnsMainTemp.push(column);
                                            }
                                            console.log('Expanded view and not BV case code ran');
                                        } else {
                                            columnsMainTemp.push(column);
                                        }
                                    } else {
                                        // Run the else statement code for when bvCase
                                        // Section at index 0 contains table headers (filter by section so variables are separated)
                                        if (section === this.layoutSections[0]) {
                                            columnsMainTemp.push(column);
                                        }
                                        console.log('BV case code ran');
                                    }
                                }
                            });
                    });
                });
            });

            // Set table data for multiple records
            this.recordData.forEach(record => {
                let recordTemp = {
                    rowId: record.Id
                };
                columnsMainTemp.forEach(col => {
                    const fieldValue = this.getFieldValueFromRecord(record, col.fieldName);
                    if (col.fieldName !== null && col.fieldName !== undefined) {
                        recordTemp[col.fieldName] = fieldValue;
                    }
                });
                if (this.objectApiName !== 'BV_Case__c') {
                    recordTemp.subRecordId = record.Id; // or however you derive the sub-record ID
                }
                tableDataTemp.push(recordTemp);
            });

            // Add row actions column, this may no longer be needed with new table component (action column is hardcoded) but doesn't currently seem to affect data prepping
            columnsTemp.push({ type: 'action', typeAttributes: { rowActions: this.getRowActions.bind(this) } });

            // Make all columns sortable
            columnsTemp = columnsTemp.map(col => {
                return { ...col, sortable: true };
            });

            this.columnsMain = columnsMainTemp;
            this.columns = columnsTemp;
            this.tableData = tableDataTemp;
            let mainSection = [];
            mainSection = [...mainSection, this.layoutSections[1]];
            this.sectionsMain = mainSection;

            // Create object array to be used for the table data
            let tableDataObjTemp = [];
            this.tableData.forEach(function (row, i) {
                let rowId = row.rowId;
                let keys = Object.keys(row);

                // Filter so only data for headers is pulled into the main table
                keys.forEach(key => {
                    let isHeader = columnsMainTemp.some(col => col.fieldName === key);
                    if (!isHeader) {
                        delete row[key];
                    }
                });

                // Get values after filtering the keys
                let values = Object.values(row);
                let valueMap = [];
                values.forEach(function (value, i2) {
                    const valueItem = {
                        Id: i2,
                        value: value
                    };
                    valueMap.push(valueItem);
                });

                // Ensure each row is assigned to a cell properly
                const item = {
                    Id: rowId,
                    Cells: valueMap
                }
                tableDataObjTemp.push(item);
            });

            // Assign the processed table data to the tableDataObj
            this.tableDataObj = tableDataObjTemp;

            // Prep data for expanded view field values
            let filteredData = this.recordData;
            if (this.subRecordId) {
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
                        value: record[column.fieldName] || '—',
                        length: column.length || null
                    }))
            }));

            // Mark positions for dividers
            this.markDividerPositions();

            // Merge table data with expanded view field values
            this.tableDataObj.forEach(row => {
                row['fullData'] = this.preprocessFullData(this.combinedData.filter(dataRow => dataRow.id === row.Id));
            });

            this.combinedData = this.preprocessKeys(this.combinedData);

            console.log('Columns Map: ', columnsMainTemp);
            console.log('Columns Main: ', JSON.stringify(this.columnsMain));
            console.log('Sections Main: ', JSON.stringify(this.sectionsMain));
            console.log('Columns:', JSON.stringify(this.columns));
            console.log('Table Data:', JSON.stringify(this.tableData, this.replacer));
            console.log('Table Data Object: ', JSON.stringify(this.tableDataObj));
            console.log('Record Data: ', JSON.stringify(this.recordData, this.replacer));
            console.log('Combined Data: ', JSON.stringify(this.combinedData));

            // We want to see how many columns the section has, so we need to read the "columns" attribute
            this.sectionsMain.forEach(section => {
                this.columnLayoutStyle = section.columns;
                this.databaseScreenHeading = section.heading;
            });

            // Populate left and right columns for expanded view
            this.populateExpandedColumns();
            this.registerErrorListener();
            this.handleSubscribe();

        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading layout',
                    message: error.body.message,
                    variant: 'error',
                    mode: 'sticky'
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
            refreshApex(this.wiredLayoutResult)
                .then(() => {
                    // Reapply the sorting after data is reloaded
                    if (this.sortedBy && this.sortDirection) {
                        this.sortData(this.sortedBy, this.sortDirection);
                    }
                });
        }
    }

    openModal() {
        this.lastFocusedElement = this.template.activeElement;
        this.isModalOpen = true;
        this.trapFocusInModal();
    }

    closeModal() {
        this.isModalOpen = false;
        this.subRecordId = null;
        this.returnFocusToLastElement();
    }

    openModalDelete() {
        this.lastFocusedElement = this.template.activeElement;
        this.isModalOpenDelete = true;
        this.trapFocusInModal();
    }

    closeModalDelete() {
        this.isModalOpenDelete = false;
        this.subRecordId = null;
        this.returnFocusToLastElement();
    }

    trapFocusInModal() {
        const modal = this.template.querySelector('.slds-modal');
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];

        modal.addEventListener('keydown', (e) => {
            const isTabPressed = e.key === 'Tab' || e.keyCode === 9;

            if (!isTabPressed) {
                return;
            }

            if (e.shiftKey) {
                if (document.activeElement === firstFocusableElement) {
                    lastFocusableElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusableElement) {
                    firstFocusableElement.focus();
                    e.preventDefault();
                }
            }
        });

        firstFocusableElement.focus();
    }

    returnFocusToLastElement() {
        if (this.lastFocusedElement) {
            this.lastFocusedElement.focus();
        }
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
        const recordId = event.target.dataset.row;
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

    handleRecordUpdated(event) {
        this.isModalOpen = false;
        this.subRecordId = null;
        this.hasDataBeenUpdated = true;
        this.loadLayout();
    
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Your changes have been saved.',
                variant: 'success',
                mode: 'sticky'
            }),
        );
    
        this.hasDataBeenUpdated = false;
    }

    handleRecordDeleted(event) {
        this.isModalOpenDelete = false;
        this.subRecordId = null;
        this.hasDataBeenUpdated = true;
        this.loadLayout();
    
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'The record has been deleted.',
                variant: 'success',
                mode: 'sticky'
            }),
        );
    
        this.hasDataBeenUpdated = false;
    }

    handleCancelUpdate() {
        this.isModalOpenDelete = false;
        this.isModalOpen = false;
    }

    onHandleSort(event) {
        event.preventDefault();
        
        console.log('Sorting by: ' + event.currentTarget.dataset.field);
        
        const sortedBy = event.currentTarget.dataset.field;
        const sortDirection = this.sortedBy === sortedBy && this.sortDirection === 'asc' ? 'desc' : 'asc';
        this.sortDirection = sortDirection;
        this.sortedBy = sortedBy;
        
        this.sortData(sortedBy, sortDirection);
        this.updateSortIcons(); // Ensure icons are updated after sorting
    }
    
    sortData(sortedBy, sortDirection) {
        const sortMultiplier = sortDirection === 'asc' ? 1 : -1;
    
        const cloneData = [...this.tableData];
        const cloneTableData = [...this.tableDataObj];
    
        const naturalSort = (a, b) => {
            const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
            return collator.compare(a, b);
        };
    
        const sortBy = (field, multiplier) => {
            return (a, b) => {
                let aValue = a[field];
                let bValue = b[field];
    
                return naturalSort(aValue, bValue) * multiplier;
            };
        };
    
        const sortByValue = (a, b) => {
            const aValue = a.Cells[0].value;
            const bValue = b.Cells[0].value;
    
            return naturalSort(aValue, bValue) * sortMultiplier;
        };
    
        cloneData.sort(sortBy(sortedBy, sortMultiplier));
        cloneTableData.sort(sortByValue);
    
        this.tableData = cloneData;
        this.tableDataObj = cloneTableData;
        this.updateSortIcons();
    }

    updateSortIcons() {
        this.columnsMain = this.columnsMain.map(column => {
            if (this.sortedBy === column.fieldName) {
                return {
                    ...column,
                    isSortedAsc: this.sortDirection === 'asc',
                    isSortedDesc: this.sortDirection === 'desc',
                    ariaSort: this.sortDirection === 'asc' ? 'ascending' : 'descending' // Corrected values
                };
            }
            return {
                ...column,
                isSortedAsc: false,
                isSortedDesc: false,
                ariaSort: 'none' // Default value
            };
        });
    }

    connectedCallback() {
        this.updateSortIcons();
    }

    // Handle expanded view dropdown event
    expandSection(event) {
        const targetRowId = event.currentTarget.dataset.targetrow;
        const rowElement = this.template.querySelector(`div[data-rowid="${targetRowId}"]`);
        
        if (rowElement.style.display === 'none') {
            rowElement.style.display = 'block';
            this.expandedRows.add(targetRowId); // Add to expanded set
        } else {
            rowElement.style.display = 'none';
            this.expandedRows.delete(targetRowId); // Remove from expanded set
        }

        const icon = event.currentTarget.querySelector('lightning-icon');
        icon.iconName = icon.iconName === 'utility:chevronright' ? 'utility:chevrondown' : 'utility:chevronright';

        // Update aria-expanded attribute
        event.currentTarget.setAttribute('aria-expanded', this.expandedRows.has(targetRowId));
    }

    // Utility method to show blank object values in console
    replacer(key, value) {
        if (value === undefined || value === null) {
            return 'null';
        }
        return value;
    }

    splitFieldsByColumns() {
        const leftFields = [];
        const rightFields = [];
    
        // Ensure fieldDataTypes is populated
        const fieldDataTypes = this.wiredLayoutResult.data.fieldDataTypes || {};
    
        this.layoutSections.forEach(section => {
            if (section.heading === 'Fields') {
                section.layoutRows.forEach((row, rowIndex) => {
                    row.layoutItems.forEach((item, itemIndex) => {
                        item.layoutComponents.forEach((component, componentIndex) => {
                            if (component.componentType === 'Field' || component.componentType === 'EmptySpace') {
                                const fieldType = fieldDataTypes[component.apiName] || 'text';
                                if (itemIndex % 2 === 0) {
                                    leftFields.push({ ...component, rowIndex, itemIndex, type: fieldType });
                                } else {
                                    rightFields.push({ ...component, rowIndex, itemIndex, type: fieldType });
                                }
                            }
                        });
                    });
                });
            }
        });
    
        this.leftColumnFields = leftFields;
        this.rightColumnFields = rightFields;
    
        console.log('left column layout fields', JSON.stringify(this.leftColumnFields, null, 2));
        console.log('right column layout fields', JSON.stringify(this.rightColumnFields, null, 2));
    }

    adjustEmptySpaceIndices() {
        let newEmptySpaceDetails = [];
    
        // Step 1: Find matching EmptySpace indices in both columns and record details
        for (let i = 0; i < Math.max(this.leftColumnFields.length, this.rightColumnFields.length); i++) {
            const leftField = i < this.leftColumnFields.length ? this.leftColumnFields[i] : null;
            const rightField = i < this.rightColumnFields.length ? this.rightColumnFields[i] : null;
    
            // Check if both fields are EmptySpace at the same index
            if (leftField && rightField && leftField.componentType === 'EmptySpace' && rightField.componentType === 'EmptySpace') {
                // Find the closest non-EmptySpace field's apiName
                let closestApiName = null;
                if (i > 0) {
                    // Check previous index for closest non-EmptySpace field
                    if (i - 1 < this.leftColumnFields.length && this.leftColumnFields[i - 1].componentType !== 'EmptySpace') {
                        closestApiName = this.leftColumnFields[i - 1].apiName;
                    } else if (i - 1 < this.rightColumnFields.length && this.rightColumnFields[i - 1].componentType !== 'EmptySpace') {
                        closestApiName = this.rightColumnFields[i - 1].apiName;
                    }
                }
                // If no closest field found from previous index, check next index
                if (!closestApiName && i + 1 < Math.max(this.leftColumnFields.length, this.rightColumnFields.length)) {
                    if (i + 1 < this.leftColumnFields.length && this.leftColumnFields[i + 1].componentType !== 'EmptySpace') {
                        closestApiName = this.leftColumnFields[i + 1].apiName;
                    } else if (i + 1 < this.rightColumnFields.length && this.rightColumnFields[i + 1].componentType !== 'EmptySpace') {
                        closestApiName = this.rightColumnFields[i + 1].apiName;
                    }
                }
                newEmptySpaceDetails.push({
                    index: i,
                    closestApiName: closestApiName
                });
            }
        }
    
        // Step 2: Combine the left and right columns while excluding EmptySpaces
        const combinedFields = [];
        for (let i = 0; i < Math.max(this.leftColumnFields.length, this.rightColumnFields.length); i++) {
            if (i < this.leftColumnFields.length && this.leftColumnFields[i].componentType !== 'EmptySpace') {
                combinedFields.push(this.leftColumnFields[i]);
            }
            if (i < this.rightColumnFields.length && this.rightColumnFields[i].componentType !== 'EmptySpace') {
                combinedFields.push(this.rightColumnFields[i]);
            }
        }
    
        // Step 3: Map the EmptySpace details to the combined array
        let adjustedEmptySpaceIndices = newEmptySpaceDetails.map(detail => {
            // Find the combined index of the closest non-EmptySpace field
            let combinedIndex = combinedFields.findIndex(field => field.apiName === detail.closestApiName);
            return combinedIndex;
        });
    
        // Sort the new empty space indices
        adjustedEmptySpaceIndices.sort((a, b) => a - b);

        // +1 to each index to account for the missing fields
        adjustedEmptySpaceIndices = adjustedEmptySpaceIndices.map(index => index + 1);
    
        // Update emptySpaceIndices with the new calculated indices
        this.emptySpaceIndices = adjustedEmptySpaceIndices;
    
        console.log('Adjusted Empty Space Indices: ', this.emptySpaceIndices);
    }

    // Method to mark divider positions in combined data
    markDividerPositions() {
        this.combinedData.forEach(record => {
            record.fieldsWithDividers = [];
            record.fields.forEach((field, index) => {
                record.fieldsWithDividers.push({
                    ...field,
                    insertDivider: this.emptySpaceIndices.includes(index)
                });
            });
        });
    }

    // Helper method to check if all items in a row are EmptySpace components
    isRowAllEmptySpaces(layoutItems) {
        return layoutItems.every(item => item.layoutComponents.some(component => component.componentType === 'EmptySpace'));
    }

    // Helper method to get the label of a field from left and right columns at a given position
    getFieldLabelFromColumn(index) {
        const leftField = this.leftColumnFields[index];
        const rightField = this.rightColumnFields[index];

        return `${leftField.label || 'No field'} - ${rightField.label || 'No field'}`;
    }

    resetComponent() {
        this.tableDataObj = [];
        this.layoutSections = [];
        this.sectionsMain = [];
        this.recordData = null;
        this.columns = [];
        this.columnsMain = [];
        this.tableData = [];
        this.combinedData = [];
        this.sortedBy = null;
        this.sortedDirection = null;
        this.subRecordId = null;
        this.columnLayoutStyle = 2;
        this.emptySpaceIndices = [];
        this.isModalOpen = false;
        this.isModalOpenDelete = false;
        this.expandedView = true;
        this.multipleRecords = false;
        this.populatedLeftColumnFields = [];
        this.populatedRightColumnFields = [];
    }

    preprocessKeys(data) {
        return data.map(record => ({
            ...record,
            fieldsWithDividers: record.fields.map(field => ({
                ...field,
                labelKey: `${field.fieldName}-label`,
                valueKey: `${field.fieldName}-value`,
                dividerKey: `${field.fieldName}-divider`
            }))
        }));
    }

    // Method to preprocess and format fullData for a row
    preprocessFullData(fullData) {
        return fullData.map(dataRow => {
            return {
                ...dataRow,
                fieldsWithDividers: dataRow.fields.map(field => {
                    let formattedValue = field.value;
                    if (field.type === 'number' || field.type === 'currency') {
                        formattedValue = this.formatNumber(field.value);
                    }
                    return {
                        ...field,
                        formattedValue,
                        labelKey: `${field.fieldName}-label`,
                        valueKey: `${field.fieldName}-value`,
                        dividerKey: `${field.fieldName}-divider`
                    };
                })
            };
        });
    }

    // Helper method to format numbers with commas
    formatNumber(value) {
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        return value;
    }

    get cardHeader() {
        return this.layoutSections ? this.layoutSections.heading : 'Loading...';
    }

    get cardSubtitle() {
        console.log('Label: ', this._label);
        console.log('Parent Label: ', this._parentLabel);
        console.log('Parent Grandchild Label: ', this._parentGrandchildLabel);
        console.log('Parent Great Grandchild Label: ', this._parentGreatGrandchildLabel);

        const stripPrefix = (label) => {
            const prefixes = ['Estates - ', 'Companies - ', 'Conveyancing - ', 'FOIR - ', 'General - '];
            for (const prefix of prefixes) {
                if (label.startsWith(prefix)) {
                    return label.substring(prefix.length);
                }
            }
            return label;
        };

        if (this._label) {
            const strippedLabel = stripPrefix(this._label);
            
            if (this._parentGrandchildLabel) {
                return `${stripPrefix(this._parentGrandchildLabel)} > ${strippedLabel}`;
            }

            if (this._parentGreatGrandchildLabel) {
                return `${stripPrefix(this._parentGreatGrandchildLabel)} > ${strippedLabel}`;
            }
            
            if (this._parentLabel && this._parentLabel !== this._label) {
                return `${stripPrefix(this._parentLabel)} > ${strippedLabel}`;
            }

            return strippedLabel;
        }

        return this._parentLabel ? stripPrefix(this._parentLabel) : '';
    }

    get modalHeading() {
        // Determine heading based on the section index
        if (this.layoutSections.length > 3) {
            return this.layoutSections[3].heading;
        }
        return 'Add a record';
    }

    get editModalHeading() {
        // Determine heading based on the section index
        if (this.layoutSections.length > 4) {
            if (!this.isBVCase && !this.subRecordId) {
                return this.layoutSections[3].heading;
            } else {
                return this.layoutSections[4].heading;
            }
        }
        return 'Edit this record';
    }

    get deleteModalHeading() {
        // Determine heading based on the section index
        if (this.layoutSections.length > 5) {
            return this.layoutSections[5].heading;
        }
        return 'Delete this record';
    }

    get hasData() {
        // Ensure recordData is an array and has at least one element
        const recordData = Array.isArray(this.recordData) ? this.recordData : [];
        
        // Ensure columns is an array and has at least one element
        const columns = Array.isArray(this.columns) ? this.columns : [];
        
        // Define a function to check if a row contains only default keys
        const isDefaultRow = (row) => {
            const defaultKeys = ['Name', 'Stage__c', 'Id', 'BV_Case__c'];
            const rowKeys = Object.keys(row);
    
            // Check if row keys are a subset of default keys
            return rowKeys.every(key => defaultKeys.includes(key));
        };
        
        // Perform the checks
        if (recordData.length === 0) {
            console.log('recordData is empty');
            return false;
        }
        
        if (columns.length === 0) {
            console.log('columns is empty');
            return false;
        }
        
        // Check if there is at least one row that is not a default row
        let hasValidData = false;
        for (let row of recordData) {
            if (typeof row === 'object' && row !== null && Object.keys(row).length > 0) {
                if (!isDefaultRow(row)) {
                    hasValidData = true;
                    break;
                }
            } else {
                console.log('Invalid row in recordData:', row);
                return false;
            }
        }
    
        if (!hasValidData) {
            console.log('No valid data found in recordData');
        }
    
        return hasValidData;
    }

    get isBVCase() {
        return this.objectApiName === 'BV_Case__c';
    }

    // External record that has data, but doesn't allow multiple records
    get isEdgeCase() {
        return !this.isBVCase && this.hasData && !this.multipleRecords;
    }

    get processedData() {
        return this.combinedData.map(record => {
            return {
                ...record,
                fieldsWithDividers: record.fields.map((field, index) => {
                    return {
                        ...field,
                        insertDivider: this.emptySpaceIndices.includes(index)
                    };
                })
            };
        });
    }

    get isSortedAsc() {
        return this.sortedBy && this.sortDirection === 'asc';
    }

    get isSortedDesc() {
        return this.sortedBy && this.sortDirection === 'desc';
    }

    get isUnsorted() {
        return !this.sortedBy;
    }

    get tableDataWithIndex() {
        return this.tableDataObj.map((item, index) => {
            const formattedCells = item.Cells.map(cell => {
                let fieldType = 'text';
                if (item.fullData && item.fullData.fields) {
                    const field = item.fullData.fields.find(f => f.value === cell.value);
                    fieldType = field ? field.type : 'text';
                }
                return {
                    ...cell,
                    value: this.formatFieldValue(cell.value, fieldType)
                };
            });
    
            return {
                ...item,
                rowIndex: index + 1,
                Cells: formattedCells,
                isExpanded: this.expandedRows.has(item.Id), // Check if the row is expanded
                expandAriaLabel: `Expand details for row ${index + 1}`, // Precompute aria-label for expand button
                optionsAriaLabel: `Options for row ${index + 1}` // Precompute aria-label for options button
            };
        });
    }

    get isTwoColumnLayout() {
        return this.columnLayoutStyle === 2;
    }

    populateExpandedColumns() {
        const blankField = {
            label: '',
            value: '',
            labelKey: 'empty-label',
            valueKey: 'empty-value',
            style: 'min-height: 20px;' // Adjust this value to match the height of one line of text
        };
    
        this.tableDataObj.forEach(row => {
            const rowData = this.recordData.find(record => record.Id === row.Id);
    
            const leftFields = this.leftColumnFields.map(field => {
                if (field.componentType === 'EmptySpace') {
                    return { ...blankField };
                }
                const fieldValue = (rowData && rowData[field.apiName]) || '—';
                const formattedValue = this.formatFieldValue(fieldValue, field.type);
                const decodedLabel = this.decodeHtmlEntities(field.label); // Decode HTML entities in the label
                return {
                    ...field,
                    label: decodedLabel,
                    value: formattedValue,
                    labelKey: `${field.apiName}-label`,
                    valueKey: `${field.apiName}-value`
                };
            });
    
            const rightFields = this.rightColumnFields.map(field => {
                if (field.componentType === 'EmptySpace') {
                    return { ...blankField };
                }
                const fieldValue = (rowData && rowData[field.apiName]) || '—';
                const formattedValue = this.formatFieldValue(fieldValue, field.type);
                const decodedLabel = this.decodeHtmlEntities(field.label); // Decode HTML entities in the label
                return {
                    ...field,
                    label: decodedLabel,
                    value: formattedValue,
                    labelKey: `${field.apiName}-label`,
                    valueKey: `${field.apiName}-value`
                };
            });
    
            row.fullData = {
                fields: [...leftFields, ...rightFields],
                leftFields: leftFields,
                rightFields: rightFields
            };
        });
    }
    
    formatFieldValue(fieldValue, fieldType) {
        console.log('fieldValue:', fieldValue);
        console.log('fieldType:', fieldType);

        fieldType = fieldType ? fieldType.toLowerCase() : 'text';
    
        if (!fieldValue && fieldValue !== 0) {
            return '—'; // or any default value you want for null/undefined values
        }

        if (this.isSalesforceId(fieldValue)) {
            const relatedAccount = this.relatedAccounts[fieldValue];
            if (relatedAccount) {
                return relatedAccount.Name; // Return the Account Name from relatedAccounts map
            }
            return 'Loading...'; // Fallback in case relatedAccount is still loading or unavailable
        }
    
        if (typeof fieldValue === 'string' && fieldValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = fieldValue.split('-');
            return `${day}/${month}/${year}`;
        }
    
        if (fieldType.startsWith('currency')) {
            const parsedValue = parseFloat(fieldValue);
            return isNaN(parsedValue) ? '—' : `£${parsedValue.toFixed(2)}`;
        }
    
        if (fieldType === 'percent') {
            const parsedValue = parseFloat(fieldValue);
            return isNaN(parsedValue) ? '—' : `${parsedValue.toFixed(2)}%`;
        }
    
        if (fieldType === 'number') {
            const parsedValue = parseFloat(fieldValue);
            return isNaN(parsedValue) ? '—' : parsedValue.toLocaleString();
        }

        if (fieldType === 'checkbox' || fieldType === 'boolean') {
            if (fieldValue === true) {
                return { iconName: 'utility:check', altText: 'Checked' };
            } else if (fieldValue === false) {
                return { iconName: 'utility:close', altText: 'Cross' };
            } else {
                return { iconName: 'utility:close', altText: 'Unchecked' };
            }
        }
    
        return fieldValue;
    }

    // Method to check if the value matches Salesforce ID format
    isSalesforceId(value) {
        // Check if the value is a string and has a length of 15 or 18 characters
        if (typeof value !== 'string' || (value.length !== 15 && value.length !== 18)) {
            return false;
        }

        // Check if the first 15 characters are alphanumeric
        const base15 = value.slice(0, 15);
        if (!/^[a-zA-Z0-9]+$/.test(base15)) {
            return false;
        }

        // If it's an 18-character ID, check if the last 3 characters are alphanumeric
        if (value.length === 18) {
            const suffix = value.slice(15);
            if (!/^[a-zA-Z0-9]{3}$/.test(suffix)) {
                return false;
            }
        }

        // Additional check: Salesforce IDs typically start with specific prefixes
        const validPrefixes = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0A', '0B', '0C', '0D', '0E', '0F', '0G', '0H', '0I', '0J', '0K', '0L', '0M', '0N', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5'];
        const prefix = value.slice(0, 2).toUpperCase();

        return validPrefixes.includes(prefix);
    }

    decodeHtmlEntities(text) {
        const textArea = document.createElement('textarea');
        textArea.innerHTML = text;
        return textArea.value;
    }
}

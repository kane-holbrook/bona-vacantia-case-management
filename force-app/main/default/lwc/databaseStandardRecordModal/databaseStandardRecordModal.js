import { LightningElement, api, track, wire } from 'lwc';
import updateRecord from '@salesforce/apex/LayoutController.updateRecord';
import createRecord from '@salesforce/apex/LayoutController.createRecord';
import getPicklistValues from '@salesforce/apex/LayoutController.getPicklistValues';

export default class DatabaseStandardRecordModal extends LightningElement {
    @api recordId;
    @api objectApiName;
    @api recordData = []; // Record data passed from parent component
    @api subRecordId;
    @api columns = []; // Columns configuration passed from parent component
    @api columnLayoutStyle; // Column layout style passed from parent component
    @api recordTypeId; // Record Type Id passed from parent component
    @track combinedData = []; // Combined data to be used in the template
    @track leftColumnFields = [];
    @track rightColumnFields = [];

    connectedCallback() {
        // Ensure recordData is an array
        if (!Array.isArray(this.recordData)) {
            this.recordData = [this.recordData];
        }

        // Filter recordData if subRecordId is provided
        let filteredData = this.recordData;
        if (this.subRecordId) {
            filteredData = this.recordData.filter(record => record.Id === this.subRecordId);
        }

        // Prepare for new record creation if subRecordId is not provided and objectApiName is not BV_Case__c
        if (!this.subRecordId && this.objectApiName !== 'BV_Case__c') {
            filteredData = [{ Id: 'new', ...this.getEmptyRecordFields() }];
        }

        // Combine columns and filtered record data
        this.combinedData = filteredData.map(record => ({
            id: record.Id,
            fields: this.columns
                .filter(column => column.type !== 'action')
                .map(column => ({
                    label: column.label,
                    fieldName: column.fieldName,
                    type: column.type === 'action' ? 'text' : column.type, // Default to text if action
                    value: record[column.fieldName] || '',
                    isPicklist: column.type === 'picklist',
                    isCheckbox: column.type === 'checkbox',
                    isDefault: column.type !== 'picklist' && column.type !== 'checkbox',
                    checked: column.type === 'checkbox' ? !!record[column.fieldName] : false,
                    options: column.type === 'picklist' ? [] : []
                }))
        }));

        this.splitFieldsByColumns();

        this.loadPicklistOptions();

        console.log('Combined Data:', JSON.stringify(this.combinedData));
    }

    async loadPicklistOptions() {
        const promises = this.combinedData.flatMap(record =>
            record.fields
                .filter(item => item.isPicklist)
                .map(async item => {
                    const options = await getPicklistValues({ objectName: this.objectApiName, fieldName: item.fieldName });
                    item.options = options.map(value => ({ label: value, value }));
                })
        );
        await Promise.all(promises);
        this.combinedData = [...this.combinedData]; // trigger reactivity
    }

    getEmptyRecordFields() {
        const emptyFields = {};
        this.columns.forEach(column => {
            if (column.fieldName) {
                emptyFields[column.fieldName] = '';
            }
        });
        return emptyFields;
    }

    splitFieldsByColumns() {
        this.leftColumnFields = [];
        this.rightColumnFields = [];

        this.combinedData.forEach(record => {
            record.fields.forEach((field, index) => {
                if (index % 2 === 0) {
                    this.leftColumnFields.push(field);
                } else {
                    this.rightColumnFields.push(field);
                }
            });
        });
    }

    // Handle changes in input fields
    handleInputChange(event) {
        const recordId = event.target.dataset.recordId;
        const fieldName = event.target.name;
        const updatedValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

        // Find the corresponding item in combinedData and update its value
        this.combinedData = this.combinedData.map(record => {
            if (record.id === recordId) {
                record.fields = record.fields.map(item => {
                    if (item.fieldName === fieldName) {
                        return { ...item, value: updatedValue, checked: event.target.type === 'checkbox' ? updatedValue : item.checked };
                    }
                    return item;
                });
            }
            return record;
        });

        this.splitFieldsByColumns();
    }

    // Handle save action
    handleSave() {
        this.combinedData.forEach(record => {
            const updatedFields = {};
            record.fields.forEach(item => {
                updatedFields[item.fieldName] = item.value;

                // Sometimes a item.type of "number" gets converted to a string, we want to make sure they stay as strings due to BigInt limitations
                if (item.type === 'number') {
                    // Convert to String
                    if (item.value === '') {
                        updatedFields[item.fieldName] = null;
                    } else {
                        updatedFields[item.fieldName] = String(item.value);
                    }
                }
            });

            console.log('Updated fields for record:', record.id, updatedFields);

            if (record.id === 'new') {
                // Ensure BV_Case__c field is included
                updatedFields.BV_Case__c = this.recordId;

                // Create new record
                createRecord({ objectName: this.objectApiName, fields: updatedFields, recordTypeId: this.recordTypeId})
                    .then(() => {
                        console.log('Record created successfully');

                        // Send custom event to parent component to inform that the record has been updated
                        const recordUpdatedEvent = new CustomEvent('recordupdated', { detail: { recordId: 'new' } });
                        this.dispatchEvent(recordUpdatedEvent);
                    })
                    .catch(error => {
                        console.error('Error creating record:', error);
                    });
            } else {
                // Update existing record
                updateRecord({ recordId: record.id, objectName: this.objectApiName, updatedFields: updatedFields })
                    .then(() => {
                        console.log('Record updated successfully:', record.id);

                        // Send custom event to parent component to inform that the record has been updated
                        const recordUpdatedEvent = new CustomEvent('recordupdated', { detail: { recordId: record.id } });
                        this.dispatchEvent(recordUpdatedEvent);
                    })
                    .catch(error => {
                        console.error('Error updating record:', record.id, error);
                    });
            }
        });
    }

    // Handle cancel action
    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancelupdate'));
    }

    get isTwoColumnLayout() {
        return this.columnLayoutStyle === 2;
    }
}
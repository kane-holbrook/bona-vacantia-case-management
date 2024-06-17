import { LightningElement, api, track } from 'lwc';
import { updateRecord, createRecord } from 'lightning/uiRecordApi';
import getPicklistValues from '@salesforce/apex/LayoutController.getPicklistValues';

export default class DatabaseStandardRecordModal extends LightningElement {
    @api recordId;
    @api objectApiName;
    @api recordData = [];
    @api subRecordId;
    @api columns = [];
    @api columnLayoutStyle;
    @api recordTypeId;
    @api emptySpaceRowIndex;
    @track combinedData = [];
    @track leftColumnFields = [];
    @track rightColumnFields = [];
    @track isLoading = true; // Track the loading state

    async connectedCallback() {
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
            id: record.Id === 'new' ? 'new' : (this.objectApiName === 'BV_Case__c' ? this.recordId : record.Id),
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

        await this.loadPicklistOptions();

        this.splitFieldsByColumns();

        this.isLoading = false; // Set loading state to false after data is loaded

        console.log('Combined Data:', JSON.stringify(this.combinedData));

        console.log('emptyIndexRow', this.emptySpaceRowIndex);
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
        const leftFields = [];
        const rightFields = [];

        this.combinedData.forEach(record => {
            record.fields.forEach((field, index) => {
                if (index % 2 === 0) {
                    leftFields.push({ ...field, recordId: record.id });
                } else {
                    rightFields.push({ ...field, recordId: record.id });
                }
            });
        });

        this.leftColumnFields = leftFields;
        this.rightColumnFields = rightFields;

        console.log('left columns', this.leftColumnFields);
        console.log('right columns', this.rightColumnFields);
    }

    handleInputChange(event) {
        const recordId = event.target.dataset.recordId;
        const fieldName = event.target.name;
        const updatedValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

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

    handleSave() {
        this.combinedData.forEach(record => {
            const fields = {};
            record.fields.forEach(item => {
                fields[item.fieldName] = item.value;
            });

            console.log('Fields for record:', record.id, fields);

            if (record.id === 'new') {
                fields.BV_Case__c = this.recordId;
                fields.RecordTypeId = this.recordTypeId;

                const newRecordInput = {
                    apiName: this.objectApiName,
                    fields: fields
                };

                createRecord(newRecordInput)
                    .then((record) => {
                        console.log('Record created successfully:', record.id);
                        const recordUpdatedEvent = new CustomEvent('recordupdated', { detail: { recordId: record.id } });
                        this.dispatchEvent(recordUpdatedEvent);
                    })
                    .catch(error => {
                        console.error('Error creating record:', error);
                    });
            } else {
                fields.Id = record.id;
                fields.RecordTypeId = this.recordTypeId;

                const recordInput = {
                    fields: fields
                };

                updateRecord(recordInput)
                    .then(() => {
                        console.log('Record updated successfully:', record.id);
                        const recordUpdatedEvent = new CustomEvent('recordupdated', { detail: { recordId: record.id } });
                        this.dispatchEvent(recordUpdatedEvent);
                    })
                    .catch(error => {
                        console.error('Error updating record:', record.id, error);
                    });
            }
        });
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancelupdate'));
    }

    get isTwoColumnLayout() {
        return this.columnLayoutStyle === 2;
    }

    get leftFieldsWithDividers() {
        return this.addDividers(this.leftColumnFields);
    }

    get rightFieldsWithDividers() {
        return this.addDividers(this.rightColumnFields);
    }

    addDividers(fields) {
        const fieldsWithDividers = [];
        fields.forEach((field, index) => {
            if (this.emptySpaceRowIndex.includes(index)) {
                fieldsWithDividers.push({ isDivider: true, key: `divider-${index}` });
            }
            fieldsWithDividers.push({ ...field, key: field.fieldName });
        });
        return fieldsWithDividers;
    }
}

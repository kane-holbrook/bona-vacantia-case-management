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
    @api originalLeftColumnFields;
    @api originalRightColumnFields;
    @track combinedData = [];
    @track leftColumnFields = [];
    @track rightColumnFields = [];
    @track leftColumnFieldsWithRowIndex = [];
    @track rightColumnFieldsWithRowIndex = [];
    @track isLoading = true; // Track the loading state

    async connectedCallback() {
        try {
            if (!Array.isArray(this.recordData)) {
                this.recordData = [this.recordData];
            }

            let filteredData = this.recordData;
            if (this.subRecordId) {
                filteredData = this.recordData.filter(record => record.Id === this.subRecordId);
            }

            if (!this.subRecordId && this.objectApiName !== 'BV_Case__c') {
                filteredData = [{ Id: 'new', ...this.getEmptyRecordFields() }];
            }

            this.combinedData = filteredData.map(record => ({
                id: record.Id === 'new' ? 'new' : (this.objectApiName === 'BV_Case__c' ? this.recordId : record.Id),
                fields: this.columns
                    .filter(column => column.type !== 'action')
                    .map(column => ({
                        label: column.label,
                        fieldName: column.fieldName,
                        type: column.type === 'action' ? 'text' : column.type,
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
        } catch (error) {
            console.error('Error in connectedCallback:', error);
        } finally {
            this.isLoading = false;
        }
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
        this.combinedData = [...this.combinedData];
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
        const leftFieldsWithRowIndex = [];
        const rightFieldsWithRowIndex = [];
    
        const maxRowIndex = Math.max(this.originalLeftColumnFields.length, this.originalRightColumnFields.length);
    
        for (let i = 0; i < maxRowIndex; i++) {
            const leftItem = this.originalLeftColumnFields[i];
            const rightItem = this.originalRightColumnFields[i];
    
            if (leftItem && leftItem.componentType === 'Field') {
                const field = this.findFieldInCombinedData(leftItem.apiName);
                if (field) {
                    leftFields.push(field);
                    leftFieldsWithRowIndex.push({ ...field, rowIndex: leftItem.rowIndex });
                }
            } else {
                leftFields.push({ componentType: 'EmptySpace', rowIndex: i });
                leftFieldsWithRowIndex.push({ componentType: 'EmptySpace', rowIndex: i, isEmptySpace: true });
            }
    
            if (rightItem && rightItem.componentType === 'Field') {
                const field = this.findFieldInCombinedData(rightItem.apiName);
                if (field) {
                    rightFields.push(field);
                    rightFieldsWithRowIndex.push({ ...field, rowIndex: rightItem.rowIndex });
                }
            } else {
                rightFields.push({ componentType: 'EmptySpace', rowIndex: i });
                rightFieldsWithRowIndex.push({ componentType: 'EmptySpace', rowIndex: i, isEmptySpace: true });
            }
        }
    
        // Filter out the EmptySpace items that are at the same index in both arrays
        const filteredLeftFieldsWithRowIndex = [];
        const filteredRightFieldsWithRowIndex = [];
    
        for (let i = 0; i < leftFieldsWithRowIndex.length; i++) {
            const leftItem = leftFieldsWithRowIndex[i];
            const rightItem = rightFieldsWithRowIndex[i];
    
            if (!(leftItem.isEmptySpace && rightItem.isEmptySpace)) {
                filteredLeftFieldsWithRowIndex.push(leftItem);
                filteredRightFieldsWithRowIndex.push(rightItem);
            }
        }
    
        // Extract the fields again after filtering
        this.leftColumnFields = filteredLeftFieldsWithRowIndex.map(item => item.componentType === 'EmptySpace' ? item : this.findFieldInCombinedData(item.apiName));
        this.rightColumnFields = filteredRightFieldsWithRowIndex.map(item => item.componentType === 'EmptySpace' ? item : this.findFieldInCombinedData(item.apiName));
        this.leftColumnFieldsWithRowIndex = filteredLeftFieldsWithRowIndex;
        this.rightColumnFieldsWithRowIndex = filteredRightFieldsWithRowIndex;
    
        console.log('leftFieldsWithRowIndex', this.leftColumnFieldsWithRowIndex);
        console.log('rightFieldsWithRowIndex', this.rightColumnFieldsWithRowIndex);
    
        console.log('left columns', this.leftColumnFields);
        console.log('right columns', this.rightColumnFields);
    }

    findFieldInCombinedData(apiName) {
        for (const record of this.combinedData) {
            for (const field of record.fields) {
                if (field.fieldName === apiName) {
                    return { ...field, recordId: record.id };
                }
            }
        }
        return null;
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

            if (record.id === 'new') {
                fields.BV_Case__c = this.recordId;
                fields.RecordTypeId = this.recordTypeId;

                const newRecordInput = {
                    apiName: this.objectApiName,
                    fields: fields
                };

                createRecord(newRecordInput)
                    .then((record) => {
                        const recordUpdatedEvent = new CustomEvent('recordupdated', { detail: { recordId: record.id } });
                        this.dispatchEvent(recordUpdatedEvent);
                    })
                    .catch(error => {
                        console.error('Error creating record:', error);
                    });
            } else {
                fields.Id = record.id;
                fields.RecordTypeId = this.objectApiName === 'BV_Case__c' ? '012KM000000TQr9YAG' : this.recordTypeId; // Hardcoded ID for BV_Case__c, else dynamic ID

                const recordInput = {
                    fields: fields
                };

                updateRecord(recordInput)
                    .then(() => {
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
        if (!this.leftColumnFieldsWithRowIndex || this.leftColumnFieldsWithRowIndex.length === 0) {
            return [];
        }
        return this.addDividers(this.leftColumnFieldsWithRowIndex);
    }

    get rightFieldsWithDividers() {
        if (!this.rightColumnFieldsWithRowIndex || this.rightColumnFieldsWithRowIndex.length === 0) {
            return [];
        }
        return this.addDividers(this.rightColumnFieldsWithRowIndex);
    }

    getDividerIndices() {
        const combinedDividerIndices = [];
        const maxLength = Math.max(this.originalLeftColumnFields.length, this.originalRightColumnFields.length);

        for (let i = 0; i < maxLength; i++) {
            const leftItem = this.originalLeftColumnFields[i];
            const rightItem = this.originalRightColumnFields[i];

            if (leftItem && rightItem && leftItem.componentType === 'EmptySpace' && rightItem.componentType === 'EmptySpace' && leftItem.rowIndex === rightItem.rowIndex) {
                combinedDividerIndices.push(leftItem.rowIndex);
            }
        }

        return combinedDividerIndices;
    }

    addDividers(fields) {
        const fieldsWithDividers = [];
        const combinedDividerIndices = this.getDividerIndices();
    
        console.log('combinedDividerIndices123', combinedDividerIndices);
    
        fields.forEach((field, index) => {
            fieldsWithDividers.push({ ...field, key: field.fieldName, isEmptySpace: field.componentType === 'EmptySpace' });
    
            if (index < fields.length - 1) {
                const nextField = fields[index + 1];
                const dividerIndicesInRange = combinedDividerIndices.filter(
                    dividerIndex => field.rowIndex < dividerIndex && dividerIndex <= nextField.rowIndex
                );
    
                dividerIndicesInRange.forEach(dividerIndex => {
                    fieldsWithDividers.push({ isDivider: true, key: `divider-${dividerIndex}` });
                });
            } else {
                const lastDividerIndices = combinedDividerIndices.filter(
                    dividerIndex => dividerIndex > field.rowIndex
                );
    
                lastDividerIndices.forEach(dividerIndex => {
                    fieldsWithDividers.push({ isDivider: true, key: `divider-${dividerIndex}` });
                });
            }
        });
    
        console.log('fieldswithdividers', fieldsWithDividers);
    
        return fieldsWithDividers;
    }
}
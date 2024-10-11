import { LightningElement, api, track } from 'lwc';
import { deleteRecord, updateRecord } from 'lightning/uiRecordApi';

export default class DatabaseStandardRecordModalDelete extends LightningElement {
    @api recordId;
    @api objectApiName;
    @api subRecordId;
    @api recordData = []; // Record data passed from parent component
    @api columns = []; // Columns configuration passed from parent component
    @track combinedData = []; // Combined data to be used in the template

    connectedCallback() {
        if (this.recordData) {
            // Ensure recordData is an array
            if (!Array.isArray(this.recordData)) {
                this.recordData = [this.recordData];
            }
        }

        // Filter recordData if subRecordId is provided
        let filteredData = this.recordData;
        if (this.subRecordId) {
            filteredData = this.recordData.filter(record => record.Id === this.subRecordId);
        }

        // Combine columns and record data
        this.combinedData = filteredData.map(record => ({
            id: record.Id,
            fields: this.columns
                .filter(column => column.type !== 'action')
                .map(column => ({
                    label: column.label,
                    fieldName: column.fieldName,
                    type: column.type,
                    value: record[column.fieldName] || ''
                }))
        }));

        console.log('Combined Data:', JSON.stringify(this.combinedData));
        console.log('Subrecord' + this.subRecordId);
    }

    // Handle delete action
    handleDelete() {
        if (this.subRecordId && this.objectApiName != 'BV_Case__c') {
            // Call deleteRecord from lightning/uiRecordApi to delete the sub-record
            deleteRecord(this.subRecordId)
                .then(() => {
                    console.log('Record deleted successfully:', this.subRecordId);

                    // Send custom event to parent component to inform that the record has been deleted
                    const recordDeletedEvent = new CustomEvent('recorddeleted', { detail: { recordId: this.subRecordId } });
                    this.dispatchEvent(recordDeletedEvent);
                })
                .catch(error => {
                    console.error('Error deleting record:', this.subRecordId, error);
                });
        } else {
            // Update record to set fields to null
            this.combinedData.forEach(record => {
                const updatedFields = {};
                record.fields.forEach(item => {
                    console.log('item', item);
                    if (item.type === 'checkbox') {
                        // For checkbox fields, set to false instead of null
                        updatedFields[item.fieldName] = false;
                    } else {
                        // For other fields, set to null
                        updatedFields[item.fieldName] = null;
                    }
                });

                console.log('Updated fields for record:', record.id, updatedFields);

                // Prepare the record input for update
                const recordInput = {
                    fields: {
                        Id: record.id,
                        ...updatedFields
                    }
                };

                // Call updateRecord from lightning/uiRecordApi to update the record
                updateRecord(recordInput)
                    .then(() => {
                        console.log('Record updated successfully:', record.id);

                        // Send custom event to parent component to inform that the record has been updated
                        const recordDeletedEvent = new CustomEvent('recorddeleted', { detail: { recordId: record.id } });
                        this.dispatchEvent(recordDeletedEvent);
                    })
                    .catch(error => {
                        console.error('Error updating record:', record.id, error);
                    });
            });
        }
    }

    // Handle cancel action
    handleCancel() {
        this.dispatchEvent(new CustomEvent('canceldelete'));
    }
}
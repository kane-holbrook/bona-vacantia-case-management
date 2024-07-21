import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import TASK_ID from '@salesforce/schema/BV_Task__c.Id';
import TASK_DUE_DATE_FIELD from '@salesforce/schema/BV_Task__c.Due_Date__c';
import LAST_UPDATED_FIELD from '@salesforce/schema/BV_Task__c.Last_updated__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TaskChangeDueDateModal extends LightningElement {
    @api recordId;
    @track dueDate;

    @wire(getRecord, { recordId: '$recordId', fields: [TASK_ID, TASK_DUE_DATE_FIELD] })
    date;

    get task() {
        return this.task.data ? this.task.data.fields : {};
    }

    get dueDateValue() {
        return this.task.Due_Date__c ? this.task.Due_Date__c.value : '';
    }

    renderedCallback() {
        if (this.date.data && !this.dueDate) {
            this.dueDate = this.date.data.fields.Due_Date__c.value;
        }
    }

    handleDateInput(event) {
        this.dueDate = event.target.value;
    }

    handleSave() {
        const fields = {};
        fields[TASK_ID.fieldApiName] = this.recordId;
        fields[TASK_DUE_DATE_FIELD.fieldApiName] = this.dueDate;
        fields[LAST_UPDATED_FIELD.fieldApiName] = new Date().toISOString(); // Set current date and time

        const recordInput = { fields };

        updateRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Comments updated successfully',
                        variant: 'success'
                    })
                );
                this.closeModal();
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error updating comments',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
    }

    handleCancel() {
        this.closeModal();
    }

    closeModal() {
        const closeEvent = new CustomEvent('close');
        this.dispatchEvent(closeEvent);
    }
}
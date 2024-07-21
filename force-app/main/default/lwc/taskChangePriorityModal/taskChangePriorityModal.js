import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import TASK_ID from '@salesforce/schema/BV_Task__c.Id';
import TASK_PRIORITY_FIELD from '@salesforce/schema/BV_Task__c.Priority__c';
import LAST_UPDATED_FIELD from '@salesforce/schema/BV_Task__c.Last_updated__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TaskChangePriorityModal extends LightningElement {
    @api recordId;
    @track selectedPriority;

    @wire(getRecord, { recordId: '$recordId', fields: [TASK_ID, TASK_PRIORITY_FIELD] })
    task;

    get priorityOptions() {
        return [
            { label: 'Normal', value: 'Normal' },
            { label: 'High', value: 'High' },
            { label: 'Critical', value: 'Critical' }
        ];
    }

    get priorityValue() {
        return this.task.data ? this.task.data.fields.Priority__c.value : 'Normal';
    }

    renderedCallback() {
        if (this.task.data && !this.selectedPriority) {
            this.selectedPriority = this.task.data.fields.Priority__c.value;
        }
    }

    handlePriorityChange(event) {
        this.selectedPriority = event.detail.value;
    }

    handleSave() {
        const fields = {};
        fields[TASK_ID.fieldApiName] = this.recordId;
        fields[TASK_PRIORITY_FIELD.fieldApiName] = this.selectedPriority;
        fields[LAST_UPDATED_FIELD.fieldApiName] = new Date().toISOString(); // Set current date and time

        const recordInput = { fields };

        updateRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Priority updated successfully',
                        variant: 'success'
                    })
                );
                this.closeModal();
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error updating priority',
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
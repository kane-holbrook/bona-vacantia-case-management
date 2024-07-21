import { LightningElement, api } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import TASK_COMPLETE_FIELD from '@salesforce/schema/BV_Task__c.Complete__c';
import TASK_ID from '@salesforce/schema/BV_Task__c.Id';
import LAST_UPDATED_FIELD from '@salesforce/schema/BV_Task__c.Last_updated__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TaskMarkAsCompleteModal extends LightningElement {
    @api recordId;
    @api taskName;
    @api parentTask;
    @api assignedTo;
    @api dueDate;
    @api priority;
    @api comments;
    @api createdBy;
    @api lastModifiedBy;
    @api nextTask;

    markComplete() {
        const fields = {};
        fields[TASK_ID.fieldApiName] = this.recordId;
        fields[TASK_COMPLETE_FIELD.fieldApiName] = true;
        fields[LAST_UPDATED_FIELD.fieldApiName] = new Date().toISOString(); // Set current date and time

        const recordInput = { fields };

        updateRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Task marked as complete',
                        variant: 'success'
                    })
                );
                this.closeModal();
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error marking task complete',
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
import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import TASK_ID from '@salesforce/schema/BV_Task__c.Id';
import TASK_COMMENTS_FIELD from '@salesforce/schema/BV_Task__c.Comments__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TaskEditCommentsModal extends LightningElement {
    @api recordId; // Record ID passed from parent component
    @track comments;

    @wire(getRecord, { recordId: '$recordId', fields: [TASK_ID, TASK_COMMENTS_FIELD] })
    task;

    get taskData() {
        return this.task.data ? this.task.data.fields : {};
    }

    get commentsValue() {
        return this.taskData.Comments__c ? this.taskData.Comments__c.value : '';
    }

    renderedCallback() {
        if (!this.comments && this.task.data) {
            this.comments = this.commentsValue;
        }
    }

    handleInputComments(event) {
        this.comments = event.target.value;
    }

    handleSave() {
        const fields = {};
        fields[TASK_ID.fieldApiName] = this.recordId;
        fields[TASK_COMMENTS_FIELD.fieldApiName] = this.comments;

        const recordInput = { fields };

        console.log('recordInput: ', recordInput);
        console.log('this.comments: ', this.comments);

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
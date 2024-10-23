import { LightningElement, wire, track, api } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import getUsers from '@salesforce/apex/TaskController.getUsers';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import BV_TASK_OBJECT from '@salesforce/schema/BV_Task__c';
import ASSIGNED_TO_FIELD from '@salesforce/schema/BV_Task__c.Assigned_To__c';
import DUE_DATE_FIELD from '@salesforce/schema/BV_Task__c.Due_Date__c';
import LAST_UPDATED_FIELD from '@salesforce/schema/BV_Task__c.Last_updated__c';

export default class TaskReassign extends LightningElement {
    @api recordId;
    @track selectedCaseOfficer;
    @track selectedDate;
    @track caseOfficerOptions = [];
    @track isOpen = false;

    @wire(getObjectInfo, { objectApiName: BV_TASK_OBJECT })
    taskMetadata;

    @wire(getUsers)
    wiredUsers({ error, data }) {
        if (data) {
            console.log('User data:', data);
            this.caseOfficerOptions = data.map(user => {
                return { label: user.Name, value: user.Id };
            });
        } else if (error) {
            console.error('Error fetching users:', error);
        }
    }

    handleOfficerChange(event) {
        this.selectedCaseOfficer = event.detail.value;
    }

    handleDateChange(event) {
        this.selectedDate = event.detail.value;
    }

    handleSave() {
        const fields = {};
        fields[ASSIGNED_TO_FIELD.fieldApiName] = this.selectedCaseOfficer;
        fields[DUE_DATE_FIELD.fieldApiName] = this.selectedDate;
        fields[LAST_UPDATED_FIELD.fieldApiName] = new Date().toISOString(); // Set current date and time
        fields['Id'] = this.recordId;

        const recordInput = { fields };

        updateRecord(recordInput)
            .then(() => {
                this.showToast('Success', 'Task reassigned successfully', 'success');
                this.closeModal();
            })
            .catch(error => {
                console.error('Error reassigning task:', error);
                this.showToast('Error', 'Error reassigning task', 'error');
            });
    }

    handleCancel() {
        this.selectedCaseOfficer = null;
        this.selectedDate = null;
        this.closeModal();
    }

    openModal() {
        this.isOpen = true;
    }

    closeModal() {
        this.isOpen = false;
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: 'sticky'
        });
        this.dispatchEvent(evt);
    }
}
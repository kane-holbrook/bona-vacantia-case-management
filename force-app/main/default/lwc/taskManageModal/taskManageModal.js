import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord, getRecord } from 'lightning/uiRecordApi';
import BV_TASK_OBJECT from '@salesforce/schema/BV_Task__c';
import NAME_FIELD from '@salesforce/schema/BV_Task__c.Name';
import DESCRIPTION_FIELD from '@salesforce/schema/BV_Task__c.Description__c';
import CATEGORY_FIELD from '@salesforce/schema/BV_Task__c.Category__c';
import PRIORITY_FIELD from '@salesforce/schema/BV_Task__c.Priority__c';
import DATE_INSERTED_FIELD from '@salesforce/schema/BV_Task__c.Date_Inserted__c';
import DUE_DATE_FIELD from '@salesforce/schema/BV_Task__c.Due_Date__c';

const fields = [
    NAME_FIELD,
    DESCRIPTION_FIELD,
    CATEGORY_FIELD,
    PRIORITY_FIELD,
    DATE_INSERTED_FIELD,
    DUE_DATE_FIELD
];

export default class TaskManageModal extends LightningElement {
    @api recordId;
    @track task = {};

    timeOptions = [
        { label: 'Days', value: 'Days' },
        { label: 'Weeks', value: 'Weeks' },
        { label: 'Months', value: 'Months' },
    ];

    beforeAfterOptions = [
        { label: 'Before', value: 'Before' },
        { label: 'After', value: 'After' },
    ];

    dateInsertedOptions = [
        { label: 'Date Inserted', value: 'Date Inserted' },
    ];

    categoryOptions = [
        { label: 'Category 1', value: 'Category 1' },
        { label: 'Category 2', value: 'Category 2' },
        // Add more categories as needed
    ];

    priorityOptions = [
        { label: 'Normal', value: 'Normal' },
        { label: 'High', value: 'High' },
        { label: 'Critical', value: 'Critical' },
    ];

    @wire(getRecord, { recordId: '$recordId', fields })
    wiredRecord({ error, data }) {
        if (data) {
            this.task = data.fields;
        } else if (error) {
            this.error = error;
        }
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this.task[field] = event.target.value;
    }

    calculateDueDate() {
        const waitingPeriodInput = this.template.querySelector('#waiting-period-input').value;
        const waitingPeriodTime = this.template.querySelector('#waiting-period-time').value;
        const beforeAfter = this.template.querySelector('#before-after').value;
        const dateInserted = this.template.querySelector('#date-inserted').value;

        if (waitingPeriodInput && waitingPeriodTime && beforeAfter && dateInserted) {
            const date = new Date(dateInserted);
            let days = 0;

            switch (waitingPeriodTime) {
                case 'Days':
                    days = parseInt(waitingPeriodInput);
                    break;
                case 'Weeks':
                    days = parseInt(waitingPeriodInput) * 7;
                    break;
                case 'Months':
                    days = parseInt(waitingPeriodInput) * 30; // Approximation
                    break;
                default:
                    break;
            }

            if (beforeAfter === 'Before') {
                days = -days;
            }

            date.setDate(date.getDate() + days);

            this.template.querySelector('#due-date').value = date.toISOString().split('T')[0];
            this.task.Due_Date__c = date.toISOString().split('T')[0]; // Update task object
        } else {
            const evt = new ShowToastEvent({
                title: 'Error',
                message: 'Please fill all the fields in the Waiting period section.',
                variant: 'error',
            });
            this.dispatchEvent(evt);
        }
    }

    handleSave() {
        if (this.recordId) {
            this.updateTask();
        } else {
            this.createTask();
        }
    }

    createTask() {
        const fields = this.task;
        const recordInput = { apiName: BV_TASK_OBJECT.objectApiName, fields };

        createRecord(recordInput)
            .then(task => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Task created successfully',
                        variant: 'success',
                    }),
                );
                this.recordId = task.id;
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error creating task',
                        message: error.body.message,
                        variant: 'error',
                    }),
                );
            });
    }

    updateTask() {
        const fields = this.task;
        fields.Id = this.recordId;
        const recordInput = { fields };

        updateRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Task updated successfully',
                        variant: 'success',
                    }),
                );
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error updating task',
                        message: error.body.message,
                        variant: 'error',
                    }),
                );
            });
    }
}
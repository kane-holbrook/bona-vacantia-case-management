import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord, getRecord } from 'lightning/uiRecordApi';
import { getRecordId } from 'c/sharedService';
import BV_TASK_OBJECT from '@salesforce/schema/BV_Task__c';
import NAME_FIELD from '@salesforce/schema/BV_Task__c.Name';
import DESCRIPTION_FIELD from '@salesforce/schema/BV_Task__c.Description__c';
import SCHEDULE_CODE_FIELD from '@salesforce/schema/BV_Task__c.Schedule_Code__c';
import CASE_OFFICER_FIELD from '@salesforce/schema/BV_Task__c.Assigned_To__c';
import CATEGORY_FIELD from '@salesforce/schema/BV_Task__c.Category__c';
import PRIORITY_FIELD from '@salesforce/schema/BV_Task__c.Priority__c';
import DATE_INSERTED_FIELD from '@salesforce/schema/BV_Task__c.Date_Inserted__c';
import DUE_DATE_FIELD from '@salesforce/schema/BV_Task__c.Due_Date__c';
import GROUP_CODE_FIELD from '@salesforce/schema/BV_Task__c.Group_Code__c';
import GROUP_CODE_PICK_FIELD from '@salesforce/schema/BV_Task__c.Group_Code_Pick__c';
import GROUP_CODE_MEMBERS_FIELD from '@salesforce/schema/BV_Task__c.Group_Code_Members__c';
import OTHER_PARTY_FIELD from '@salesforce/schema/BV_Task__c.Other_party__c';
import OTHER_PARTY_SELECT_FIELD from '@salesforce/schema/BV_Task__c.Other_party_select__c';
import OTHER_PARTY_MEMBERS_FIELD from '@salesforce/schema/BV_Task__c.Other_party_members__c';
import LAST_UPDATED_FIELD from '@salesforce/schema/BV_Task__c.Last_updated__c';
import BV_CASE_LOOKUP_FIELD from '@salesforce/schema/BV_Task__c.BV_Case_Lookup__c';

const fields = [
    NAME_FIELD,
    DESCRIPTION_FIELD,
    SCHEDULE_CODE_FIELD,
    CASE_OFFICER_FIELD,
    CATEGORY_FIELD,
    PRIORITY_FIELD,
    DATE_INSERTED_FIELD,
    DUE_DATE_FIELD,
    GROUP_CODE_FIELD,
    GROUP_CODE_PICK_FIELD,
    GROUP_CODE_MEMBERS_FIELD,
    OTHER_PARTY_FIELD,
    OTHER_PARTY_SELECT_FIELD,
    OTHER_PARTY_MEMBERS_FIELD,
    LAST_UPDATED_FIELD // Include the new field in the fields array
];

export default class TaskManageModal extends LightningElement {
    @api recordId;
    @track task = {};
    @track bvCaseId;

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
        { label: '(None)', value: '(None)' },
        { label: 'Adverts', value: 'Adverts' },
        { label: 'Freedom of Information', value: 'Freedom of Information' },
        { label: 'New Case', value: 'New case' },
        { label: 'File Reviews', value: 'File Reviews' },
    ];

    priorityOptions = [
        { label: 'Normal', value: 'Normal' },
        { label: 'High', value: 'High' },
        { label: 'Critical', value: 'Critical' },
    ];

    @track waitingPeriodInputValue = '';
    @track waitingPeriodTimeValue = '';
    @track beforeAfterValue = '';

    connectedCallback() {
        if (!this.recordId) {
            this.bvCaseId = getRecordId();
        }
    }

    @wire(getRecord, { recordId: '$recordId', fields })
    wiredRecord({ error, data }) {
        if (data) {
            this.task = JSON.parse(JSON.stringify(data.fields));
            this.waitingPeriodInputValue = this.task.Waiting_Period__c ? this.task.Waiting_Period__c.value : '';
            this.waitingPeriodTimeValue = this.task.Waiting_Period_Time__c ? this.task.Waiting_Period_Time__c.value : '';
            this.beforeAfterValue = this.task.Before_After__c ? this.task.Before_After__c.value : '';
        } else if (error) {
            this.error = error;
        }
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        if (!this.task[field]) {
            this.task[field] = { value: '' };
        }
        this.task[field].value = event.target.value;
    }

    handleCheckboxChange(event) {
        const field = event.target.dataset.field;
        if (!this.task[field]) {
            this.task[field] = { value: false };
        }
        this.task[field].value = event.target.checked;
    }

    @api
    handleSave() {
        if (this.recordId) {
            this.updateTask();
        } else {
            this.createTask();
        }
    }

    createTask() {
        const fields = {};
        for (let key in this.task) {
            fields[key] = this.task[key].value;
        }
        fields[LAST_UPDATED_FIELD.fieldApiName] = new Date().toISOString(); // Set current date and time
        fields[BV_CASE_LOOKUP_FIELD.fieldApiName] = this.bvCaseId; // Set BV_Case_Lookup__c field
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
        const fields = {};
        for (let key in this.task) {
            fields[key] = this.task[key].value;
        }
        fields.Id = this.recordId;
        fields[LAST_UPDATED_FIELD.fieldApiName] = new Date().toISOString(); // Set current date and time
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

    get nameValue() {
        return this.task.Name ? this.task.Name.value : '';
    }

    get descriptionValue() {
        return this.task.Description__c ? this.task.Description__c.value : '';
    }

    get dueDateValue() {
        return this.task.Due_Date__c ? this.task.Due_Date__c.value : '';
    }

    get dateInsertedValue() {
        return this.task.Date_Inserted__c ? this.task.Date_Inserted__c.value : '';
    }

    get priorityValue() {
        return this.task.Priority__c ? this.task.Priority__c.value : '';
    }

    get scheduleCodeValue() {
        return this.task.Schedule_Code__c ? this.task.Schedule_Code__c.value : '';
    }

    get caseOfficerValue() {
        return this.task.Assigned_To__c ? this.task.Assigned_To__c.value : '';
    }

    get categoryValue() {
        return this.task.Category__c ? this.task.Category__c.value : '';
    }
}
import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord, getRecord } from 'lightning/uiRecordApi';
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
    OTHER_PARTY_MEMBERS_FIELD
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

    postTrayOptions = [
        { label: 'Queue name not setup', value: 'Queue name not setup' },
        { label: 'Post Tray', value: 'Post Tray' },
        { label: 'Letters', value: 'Letters' },
        { label: 'Labels', value: 'Labels' },
    ];

    scheduleCodeOptions = [
        { label: 'Acknowledge Request', value: 'ATI' },
        { label: 'Reply due!', value: 'DRD' },
        { label: 'New FOI request', value: 'NFR' },
        { label: 'Response due in 10 working days', value: 'REM' },
        { label: 'Reply from applicant', value: 'REP' },
        { label: 'Third party reply?', value: 'TPR' },
    ];

    groupCodeOptions = [
        { label: 'ADDR Occupiers Address', value: 'ADDR Occupiers Address' },
        { label: 'MPLT MP\'s Letters', value: 'MPLT MP\'s Letters' },
        { label: 'OADD Other Addresses', value: 'OADD Other Addresses' },
        { label: 'XREF Manual Cross Refs', value: 'XREF Manual Cross Refs' },
    ];

    groupCodeMembers = [
        { label: 'All members', value: 'All members' },
    ];

    otherPartyOptions = [
        { label: 'Name', value: 'Name' },
        { label: 'Address', value: 'Address' },
        { label: 'Trading As', value: 'Trading As' },
        { label: 'Contact', value: 'Contact' },
        { label: 'Salutation', value: 'Salutation' },
    ];

    otherPartyMembers = [
        { label: 'All members', value: 'All members' },
    ];

    @wire(getRecord, { recordId: '$recordId', fields })
    wiredRecord({ error, data }) {
        if (data) {
            this.task = JSON.parse(JSON.stringify(data.fields));
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
            if (!this.task.Due_Date__c) {
                this.task.Due_Date__c = { value: '' };
            }
            this.task.Due_Date__c.value = date.toISOString().split('T')[0]; // Update task object
        } else {
            const evt = new ShowToastEvent({
                title: 'Error',
                message: 'Please fill all the fields in the Waiting period section.',
                variant: 'error',
            });
            this.dispatchEvent(evt);
        }
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

    get groupCodeValue() {
        return this.task.Group_Code__c ? this.task.Group_Code__c.value : false;
    }

    get groupCodePickValue() {
        return this.task.Group_Code_Pick__c ? this.task.Group_Code_Pick__c.value : '';
    }

    get groupCodeMembersValue() {
        return this.task.Group_Code_Members__c ? this.task.Group_Code_Members__c.value : '';
    }

    get otherPartyValue() {
        return this.task.Other_party__c ? this.task.Other_party__c.value : false;
    }

    get otherPartySelectValue() {
        return this.task.Other_party_select__c ? this.task.Other_party_select__c.value : '';
    }

    get otherPartyMembersValue() {
        return this.task.Other_party_members__c ? this.task.Other_party_members__c.value : '';
    }
}